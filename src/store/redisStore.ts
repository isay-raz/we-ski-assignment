import Redis from 'ioredis';
import { Accommodation, ResultStore, SlotResult, SlotStatus } from '../types';

export class RedisStore implements ResultStore {
  private readonly redis: Redis;

  constructor(redisUrl: string, private readonly ttlSeconds: number) {
    this.redis = new Redis(redisUrl, { lazyConnect: false, maxRetriesPerRequest: 3 });
  }

  private statusKey(slotKey: string): string {
    return `slot:${slotKey}:status`;
  }

  private itemsKey(slotKey: string): string {
    return `slot:${slotKey}:items`;
  }

  async claimSlot(slotKey: string): Promise<boolean> {
    const result = await this.redis.set(this.statusKey(slotKey), 'pending', 'EX', this.ttlSeconds, 'NX');
    return result === 'OK';
  }

  async addSlotResults(slotKey: string, accommodations: Accommodation[]): Promise<void> {
    if (accommodations.length === 0) return;
    const encoded = accommodations.map((a) => JSON.stringify(a));
    await this.redis.rpush(this.itemsKey(slotKey), ...encoded);
    await this.redis.expire(this.itemsKey(slotKey), this.ttlSeconds);
  }

  async markSlotDone(slotKey: string): Promise<void> {
    await this.redis.set(this.statusKey(slotKey), 'done', 'EX', this.ttlSeconds);
  }

  async markSlotFailed(slotKey: string): Promise<void> {
    await this.redis.set(this.statusKey(slotKey), 'failed', 'EX', this.ttlSeconds);
  }

  async getSlot(slotKey: string): Promise<SlotResult | null> {
    const status = await this.redis.get(this.statusKey(slotKey));
    if (status === null) return null;

    const items = await this.redis.lrange(this.itemsKey(slotKey), 0, -1);
    const accommodations = items.map((raw) => JSON.parse(raw) as Accommodation);

    return { status: status as SlotStatus, accommodations };
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
