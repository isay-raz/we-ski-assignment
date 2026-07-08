import { Accommodation, HotelProvider, ResultStore, SearchQuery, SearchResult, SearchStatus } from '../types';
import { ensureSlicesFetched, neededSlices } from './aggregator';
import { decodeSearchId, encodeSearchId } from './searchId';

export class SearchService {
  constructor(
    private readonly store: ResultStore,
    private readonly providers: HotelProvider[],
    private readonly maxGroupSize: number,
  ) {}

  async createSearch(query: SearchQuery): Promise<string> {
    const id = encodeSearchId(query);
    this.ensureStarted(query);
    return id;
  }

  async getSearch(id: string): Promise<SearchResult> {
    const query = decodeSearchId(id);
    this.ensureStarted(query);

    const slices = neededSlices(query, this.providers, this.maxGroupSize);
    const records = await Promise.all(slices.map((slice) => this.store.getSlice(slice.sliceId)));

    const accommodations = cheapestPerHotel(records.flatMap((record) => record?.accommodations ?? []));
    const settled = records.filter(
      (record) => record?.status === 'done' || record?.status === 'failed',
    ).length;
    const total = slices.length;

    let status: SearchStatus;
    if (settled < total) {
      status = 'in_progress';
    } else if (total > 0 && records.every((record) => record?.status === 'failed')) {
      status = 'failed';
    } else {
      status = 'completed';
    }

    return { status, accommodations, completedTasks: settled, totalTasks: total };
  }

  private ensureStarted(query: SearchQuery): void {
    ensureSlicesFetched(query, this.providers, this.store, this.maxGroupSize);
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
