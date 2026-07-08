function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${name}: "${raw}" (expected a positive number)`);
  }
  return parsed;
}

export const config = {
  port: intFromEnv('PORT', 3000),

  maxGroupSize: intFromEnv('MAX_GROUP_SIZE', 5),

  provider: {
    hotelsSimulatorUrl:
      process.env.HOTELS_SIMULATOR_URL ??
      'https://gya7b1xubh.execute-api.eu-west-2.amazonaws.com/default/HotelsSimulator',
    timeoutMs: intFromEnv('PROVIDER_TIMEOUT_MS', 15000),
    retries: intFromEnv('PROVIDER_RETRIES', 2),
    retryBackoffMs: intFromEnv('PROVIDER_RETRY_BACKOFF_MS', 300),
  },

  store: {
    redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    ttlSeconds: intFromEnv('SEARCH_TTL_SECONDS', 600),
  },

  log: {
    level: process.env.LOG_LEVEL ?? 'info',
    pretty: process.env.LOG_PRETTY === 'true',
  },
} as const;

export type Config = typeof config;
