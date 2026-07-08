import Redis from 'ioredis';
import { Accommodation, ResultStore, SearchStatus, StoredSearch } from '../types';

export class RedisStore implements ResultStore {
  private readonly redis: Redis;

  constructor(redisUrl: string, private readonly ttlSeconds: number) {
    this.redis = new Redis(redisUrl, { lazyConnect: false, maxRetriesPerRequest: 3 });
  }

  private metaKey(id: string): string {
    return `search:${id}:meta`;
  }

  private itemsKey(id: string): string {
    return `search:${id}:items`;
  }

  async claim(id: string, totalTasks: number): Promise<boolean> {
    const won = await this.redis.hsetnx(this.metaKey(id), 'status', 'in_progress');
    if (won !== 1) return false;

    await this.redis.hset(this.metaKey(id), 'completedTasks', 0, 'totalTasks', totalTasks);
    await this.redis.expire(this.metaKey(id), this.ttlSeconds);
    return true;
  }

  async recordTaskResult(id: string, accommodations: Accommodation[]): Promise<void> {
    if (accommodations.length > 0) {
      const encoded = accommodations.map((a) => JSON.stringify(a));
      await this.redis.rpush(this.itemsKey(id), ...encoded);
      await this.redis.expire(this.itemsKey(id), this.ttlSeconds);
    }
    await this.redis.hincrby(this.metaKey(id), 'completedTasks', 1);
    await this.redis.expire(this.metaKey(id), this.ttlSeconds);
  }

  async finalize(id: string, status: SearchStatus): Promise<void> {
    await this.redis.hset(this.metaKey(id), 'status', status);
    await this.redis.expire(this.metaKey(id), this.ttlSeconds);
  }

  async get(id: string): Promise<StoredSearch | null> {
    const meta = await this.redis.hgetall(this.metaKey(id));
    if (!meta || Object.keys(meta).length === 0) return null;

    const items = await this.redis.lrange(this.itemsKey(id), 0, -1);
    const accommodations = items.map((raw) => JSON.parse(raw) as Accommodation);

    return {
      status: (meta.status as SearchStatus) ?? 'in_progress',
      accommodations,
      completedTasks: Number(meta.completedTasks ?? 0),
      totalTasks: Number(meta.totalTasks ?? 0),
    };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
