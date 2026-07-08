import { HotelProvider, ResultStore, SearchQuery } from '../types';
import { logger } from '../utils/logger';
import { sliceKey } from './searchId';

export function groupSizesFor(requested: number, maxGroupSize: number): number[] {
  const start = Math.max(1, Math.floor(requested));
  const sizes: number[] = [];
  for (let size = start; size <= maxGroupSize; size++) sizes.push(size);
  return sizes;
}

export interface Slice {
  provider: HotelProvider;
  size: number;
  sliceId: string;
}

export function neededSlices(
  query: SearchQuery,
  providers: HotelProvider[],
  maxGroupSize: number,
): Slice[] {
  const slices: Slice[] = [];
  for (const provider of providers) {
    for (const size of groupSizesFor(query.group_size, maxGroupSize)) {
      slices.push({ provider, size, sliceId: sliceKey(provider.name, query, size) });
    }
  }
  return slices;
}

export function ensureSlicesFetched(
  query: SearchQuery,
  providers: HotelProvider[],
  store: ResultStore,
  maxGroupSize: number,
): void {
  for (const slice of neededSlices(query, providers, maxGroupSize)) {
    void fetchSlice(slice, query, store);
  }
}

async function fetchSlice(slice: Slice, query: SearchQuery, store: ResultStore): Promise<void> {
  try {
    const isOwner = await store.claimSlice(slice.sliceId);
    if (!isOwner) return;

    try {
      const accommodations = await slice.provider.search(query, slice.size);
      await store.addSliceResults(slice.sliceId, accommodations);
      await store.markSliceDone(slice.sliceId);
      logger.info(
        { sliceId: slice.sliceId, results: accommodations.length },
        'slice fetched',
      );
    } catch (error) {
      logger.warn(
        {
          sliceId: slice.sliceId,
          provider: slice.provider.name,
          size: slice.size,
          error: error instanceof Error ? error.message : String(error),
        },
        'slice fetch failed',
      );
      await store.markSliceFailed(slice.sliceId);
    }
  } catch (error) {
    logger.error(
      {
        sliceId: slice.sliceId,
        error: error instanceof Error ? error.message : String(error),
      },
      'slice fetch crashed',
    );
  }
}
