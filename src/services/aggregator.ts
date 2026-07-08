import { HotelProvider, ResultStore, SearchQuery } from '../types';
import { logger } from '../utils/logger';

export function groupSizesFor(requested: number, maxGroupSize: number): number[] {
  const start = Math.max(1, Math.floor(requested));
  const sizes: number[] = [];
  for (let size = start; size <= maxGroupSize; size++) sizes.push(size);
  return sizes;
}

export async function runAggregation(
  id: string,
  query: SearchQuery,
  providers: HotelProvider[],
  store: ResultStore,
  maxGroupSize: number,
): Promise<void> {
  const sizes = groupSizesFor(query.group_size, maxGroupSize);

  const tasks: Promise<unknown>[] = [];
  for (const provider of providers) {
    for (const size of sizes) {
      tasks.push(runTask(id, query, provider, size, store));
    }
  }

  const outcomes = await Promise.allSettled(tasks);
  const allFailed = outcomes.length > 0 && outcomes.every((o) => o.status === 'rejected');

  await store.finalize(id, allFailed ? 'failed' : 'completed');
  logger.info(
    {
      searchId: id,
      tasks: outcomes.length,
      failed: outcomes.filter((o) => o.status === 'rejected').length,
      status: allFailed ? 'failed' : 'completed',
    },
    'search aggregation finished',
  );
}

async function runTask(
  id: string,
  query: SearchQuery,
  provider: HotelProvider,
  size: number,
  store: ResultStore,
): Promise<void> {
  try {
    const accommodations = await provider.search(query, size);
    await store.recordTaskResult(id, accommodations);
  } catch (error) {
    await store.recordTaskResult(id, []);
    logger.warn(
      {
        searchId: id,
        provider: provider.name,
        groupSize: size,
        error: error instanceof Error ? error.message : String(error),
      },
      'provider fan-out task failed',
    );
    throw error;
  }
}
