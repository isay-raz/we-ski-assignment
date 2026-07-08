import express, { Express, Request, Response } from 'express';
import { pinoHttp } from 'pino-http';
import { errorHandler } from './api/errors';
import { createSearchRouter } from './api/routes';
import { SearchController } from './controller/searchController';
import { SearchService } from './services/searchService';
import { logger } from './utils/logger';

export function createApp(service: SearchService): Express {
  const app = express();
  app.use(pinoHttp({ logger }));
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  const controller = new SearchController(service);
  app.use(createSearchRouter(controller));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'NotFound' });
  });

  app.use(errorHandler);

  return app;
}
