import Redis from 'ioredis';
import { Accommodation, ResultStore, SliceRecord, SliceStatus } from '../types';

export class RedisStore implements ResultStore {
  private readonly redis: Redis;

  constructor(redisUrl: string, private readonly ttlSeconds: number) {
    this.redis = new Redis(redisUrl, { lazyConnect: false, maxRetriesPerRequest: 3 });
  }

  private statusKey(sliceId: string): string {
    return `slice:${sliceId}:status`;
  }

  private itemsKey(sliceId: string): string {
    return `slice:${sliceId}:items`;
  }

  async claimSlice(sliceId: string): Promise<boolean> {
    const result = await this.redis.set(this.statusKey(sliceId), 'pending', 'EX', this.ttlSeconds, 'NX');
    return result === 'OK';
  }

  async addSliceResults(sliceId: string, accommodations: Accommodation[]): Promise<void> {
    if (accommodations.length === 0) return;
    const encoded = accommodations.map((a) => JSON.stringify(a));
    await this.redis.rpush(this.itemsKey(sliceId), ...encoded);
    await this.redis.expire(this.itemsKey(sliceId), this.ttlSeconds);
  }

  async markSliceDone(sliceId: string): Promise<void> {
    await this.redis.set(this.statusKey(sliceId), 'done', 'EX', this.ttlSeconds);
  }

  async markSliceFailed(sliceId: string): Promise<void> {
    await this.redis.set(this.statusKey(sliceId), 'failed', 'EX', this.ttlSeconds);
  }

  async getSlice(sliceId: string): Promise<SliceRecord | null> {
    const status = await this.redis.get(this.statusKey(sliceId));
    if (status === null) return null;

    const items = await this.redis.lrange(this.itemsKey(sliceId), 0, -1);
    const accommodations = items.map((raw) => JSON.parse(raw) as Accommodation);

    return { status: status as SliceStatus, accommodations };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
