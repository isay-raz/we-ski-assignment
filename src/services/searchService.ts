import { Accommodation, HotelProvider, ResultStore, SearchQuery, SearchResult } from '../types';
import { logger } from '../utils/logger';
import { runAggregation, groupSizesFor } from './aggregator';
import { encodeSearchId, decodeSearchId } from './searchId';

export class SearchService {
  constructor(
    private readonly store: ResultStore,
    private readonly providers: HotelProvider[],
    private readonly maxGroupSize: number,
  ) {}

  async createSearch(query: SearchQuery): Promise<string> {
    const id = encodeSearchId(query);
    await this.ensureStarted(id, query);
    return id;
  }

  async getSearch(id: string): Promise<SearchResult> {
    const query = decodeSearchId(id);
    await this.ensureStarted(id, query);

    const snapshot = await this.store.get(id);
    if (!snapshot) {
      return { status: 'in_progress', accommodations: [], completedTasks: 0, totalTasks: 0 };
    }

    return {
      status: snapshot.status,
      accommodations: cheapestPerHotel(snapshot.accommodations),
      completedTasks: snapshot.completedTasks,
      totalTasks: snapshot.totalTasks,
    };
  }

  private async ensureStarted(id: string, query: SearchQuery): Promise<void> {
    const totalTasks = this.providers.length * groupSizesFor(query.group_size, this.maxGroupSize).length;
    const isOwner = await this.store.claim(id, totalTasks);
    if (!isOwner) return;

    void this.runSearch(id, query);
  }

  private async runSearch(id: string, query: SearchQuery): Promise<void> {
    try {
      await runAggregation(id, query, this.providers, this.store, this.maxGroupSize);
    } catch (error) {
      logger.error(
        {
          searchId: id,
          error: error instanceof Error ? error.message : String(error),
        },
        'aggregation crashed',
      );
      try {
        await this.store.finalize(id, 'failed');
      } catch {
        return;
      }
    }
  }
}

export function cheapestPerHotel(accommodations: Accommodation[]): Accommodation[] {
  const byHotel = new Map<string, Accommodation>();

  for (const acc of accommodations) {
    const existing = byHotel.get(acc.hotelCode);
    const price = acc.price.afterTax ?? Number.POSITIVE_INFINITY;
    const existingPrice = existing ? existing.price.afterTax ?? Number.POSITIVE_INFINITY : Infinity;
    if (!existing || price < existingPrice) {
      byHotel.set(acc.hotelCode, acc);
    }
  }

  return [...byHotel.values()];
}
