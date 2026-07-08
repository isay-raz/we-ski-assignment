import { createApp } from './app';
import { config } from './config';
import { createProviders } from './client/registry';
import { SearchService } from './services/searchService';
import { createResultStore } from './store';
import { logger } from './utils/logger';

function main(): void {
  const store = createResultStore();
  const providers = createProviders();
  const service = new SearchService(store, providers, config.maxGroupSize);
  const app = createApp(service);

  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        maxGroupSize: config.maxGroupSize,
        providers: providers.map((p) => p.name),
      },
      'server listening',
    );
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await store.close();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
