import { config } from '../../config';
import { Accommodation, HotelProvider, HotelsSimulatorResponse, SearchQuery } from '../../types';
import { postJson } from '../http';
import { mapAccommodation } from './mapper';

export class DummyProvider implements HotelProvider {
  readonly name = 'dummy';

  constructor(private readonly url: string = config.provider.hotelsSimulatorUrl) {}

  async search(query: SearchQuery, groupSize: number): Promise<Accommodation[]> {
    const requestBody = {
      query: {
        ski_site: query.ski_site,
        from_date: query.from_date,
        to_date: query.to_date,
        group_size: groupSize,
      },
    };

    const response = await postJson<HotelsSimulatorResponse>(this.url, requestBody, {
      timeoutMs: config.provider.timeoutMs,
      retries: config.provider.retries,
      retryBackoffMs: config.provider.retryBackoffMs,
    });

    const accommodations = response?.body?.accommodations ?? [];
    return accommodations.map((raw) => mapAccommodation(raw, groupSize, this.name));
  }
}
