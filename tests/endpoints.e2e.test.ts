import { describe, it, expect, beforeAll } from 'vitest';
import Redis from 'ioredis';
import request from 'supertest';
import { createApp } from '../src/app';
import { SearchService } from '../src/services/searchService';
import { createProviders } from '../src/client/registry';
import { RedisStore } from '../src/store/redisStore';
import { config } from '../src/config';
import { Accommodation } from '../src/types';

const body = {
  ski_site: 1,
  from_date: '03/04/2025',
  to_date: '03/11/2025',
  group_size: 2,
};

async function cleanRedisStore(): Promise<void> {
  const redis = new Redis(config.store.redisUrl);
  const keys = await redis.keys('search:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.quit();
}

describe('search endpoints', () => {
  beforeAll(async () => {
    await cleanRedisStore();
  });

  it('POST returns an id fast, GET polled every 1s streams results until completed', async () => {
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
});
