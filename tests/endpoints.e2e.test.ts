import { describe, it, expect, beforeEach } from 'vitest';
import Redis from 'ioredis';
import request from 'supertest';
import { createApp } from '../src/app';
import { SearchService } from '../src/services/searchService';
import { createProviders } from '../src/client/registry';
import { DummyProvider } from '../src/client/providers/dummyProvider';
import { RedisStore } from '../src/store/redisStore';
import { config } from '../src/config';
import { Accommodation, HotelProvider, SearchQuery } from '../src/types';

const body = {
  ski_site: 1,
  from_date: '03/04/2025',
  to_date: '03/11/2025',
  group_size: 2,
};

class CountingProvider implements HotelProvider {
  readonly name: string;
  calls = 0;

  constructor(private readonly inner: HotelProvider) {
    this.name = inner.name;
  }

  async search(query: SearchQuery, groupSize: number): Promise<Accommodation[]> {
    this.calls += 1;
    return this.inner.search(query, groupSize);
  }
}

async function cleanRedisStore(): Promise<void> {
  const redis = new Redis(config.store.redisUrl);
  const keys = await redis.keys('slice:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.quit();
}

async function pollUntilCompleted(
  app: ReturnType<typeof createApp>,
  id: string,
): Promise<{ status: string; count: number }> {
  for (let i = 0; i < 100; i++) {
    const res = await request(app).get(`/search/${id}`);
    if (res.body.status === 'completed') return res.body;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('search did not complete in time');
}

describe('search endpoints', () => {
  beforeEach(async () => {
    await cleanRedisStore();
  });

  it('POST returns an id fast, GET polled every 200ms streams results until completed', async () => {
    const store = new RedisStore(config.store.redisUrl, config.store.ttlSeconds);
    const service = new SearchService(store, createProviders(), config.maxGroupSize);
    const app = createApp(service);

    const startedAt = Date.now();
    const post = await request(app).post('/search').send(body);
    const postMs = Date.now() - startedAt;

    expect(post.status).toBe(201);
    expect(typeof post.body.id).toBe('string');
    const id = post.body.id;
    console.log(`\n[POST /search] id=${id} | took ${postMs}ms\n`);

    let poll = 0;
    let last: { status: string; count: number; progress: { completed: number; total: number }; accommodations: Accommodation[] } | undefined;

    while (poll < 100) {
      poll += 1;
      const res = await request(app).get(`/search/${id}`);
      last = res.body;
      const names = last!.accommodations.map((a) => a.hotelName);
      const elapsed = Date.now() - startedAt;
      console.log(
        `[GET #${poll} @ ${elapsed}ms] status=${last!.status} progress=${last!.progress.completed}/${last!.progress.total} results(${last!.count}): [${names.join(', ')}]`,
      );
      if (last!.status === 'completed') break;
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(last?.status).toBe('completed');
    expect(last?.count).toBeGreaterThan(0);

    await store.close();
  }, 60000);

  it('serves cached slices immediately — group_size 3 and 4 reuse the group_size 2 fetch', async () => {
    const provider = new CountingProvider(new DummyProvider());
    const store = new RedisStore(config.store.redisUrl, config.store.ttlSeconds);
    const service = new SearchService(store, [provider], config.maxGroupSize);
    const app = createApp(service);

    const warm = await request(app).post('/search').send({ ...body, group_size: 2 });
    await pollUntilCompleted(app, warm.body.id);
    const callsAfterWarm = provider.calls;
    console.log(`\n[warm group_size=2] provider calls = ${callsAfterWarm}\n`);
    expect(callsAfterWarm).toBeGreaterThan(0);

    for (const gs of [3, 4]) {
      const post = await request(app).post('/search').send({ ...body, group_size: gs });
      const startedAt = Date.now();
      const res = await request(app).get(`/search/${post.body.id}`);
      const ms = Date.now() - startedAt;
      console.log(
        `[group_size=${gs}] first GET status=${res.body.status} count=${res.body.count} took=${ms}ms providerCalls=${provider.calls}`,
      );
      expect(res.body.status).toBe('completed');
      expect(res.body.count).toBeGreaterThan(0);
    }

    expect(provider.calls).toBe(callsAfterWarm);
    console.log(`\n[result] provider calls stayed at ${provider.calls} — sizes 3 and 4 served from cache\n`);

    await store.close();
  }, 60000);
});
