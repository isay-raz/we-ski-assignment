import { AvailabilitySlot, HotelProvider, ResultStore, SearchQuery } from '../types';
import { logger } from '../utils/logger';
import { slotKey } from './searchId';

export function groupSizesFor(requested: number, maxGroupSize: number): number[] {
  const start = Math.max(1, Math.floor(requested));
  const sizes: number[] = [];
  for (let size = start; size <= maxGroupSize; size++) sizes.push(size);
  return sizes;
}

export function neededSlots(
  query: SearchQuery,
  providers: HotelProvider[],
  maxGroupSize: number,
): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  for (const provider of providers) {
    for (const size of groupSizesFor(query.group_size, maxGroupSize)) {
      slots.push({ provider, size, key: slotKey(provider.name, query, size) });
    }
  }
  return slots;
}

export function ensureSlotsFetched(
  query: SearchQuery,
  providers: HotelProvider[],
  store: ResultStore,
  maxGroupSize: number,
): void {
  for (const slot of neededSlots(query, providers, maxGroupSize)) {
    void fetchSlot(slot, query, store);
  }
}

async function fetchSlot(slot: AvailabilitySlot, query: SearchQuery, store: ResultStore): Promise<void> {
  try {
    const isOwner = await store.claimSlot(slot.key);
    if (!isOwner) return;

    try {
      const accommodations = await slot.provider.search(query, slot.size);
      await store.addSlotResults(slot.key, accommodations);
      await store.markSlotDone(slot.key);
      logger.info({ slot: slot.key, results: accommodations.length }, 'slot fetched');
    } catch (error) {
      logger.warn(
        {
          slot: slot.key,
          provider: slot.provider.name,
          size: slot.size,
          error: error instanceof Error ? error.message : String(error),
        },
        'slot fetch failed',
      );
      await store.markSlotFailed(slot.key);
    }
  } catch (error) {
    logger.error(
      {
        slot: slot.key,
        error: error instanceof Error ? error.message : String(error),
      },
      'slot fetch crashed',
    );
  }
}
