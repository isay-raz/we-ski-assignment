import { config } from '../config';
import { ResultStore } from '../types';
import { logger } from '../utils/logger';
import { RedisStore } from './redisStore';

export function createResultStore(): ResultStore {
  logger.info({ url: config.store.redisUrl }, 'using redis result store');
  return new RedisStore(config.store.redisUrl, config.store.ttlSeconds);
}
