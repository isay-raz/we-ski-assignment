import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { InvalidSearchIdError } from '../services/searchId';
import { logger } from '../utils/logger';

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof InvalidSearchIdError) {
    res.status(400).json({ error: 'InvalidSearchId', message: err.message });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.name, message: err.message });
    return;
  }

  logger.error(
    { error: err instanceof Error ? err.message : String(err) },
    'unhandled error',
  );
  res.status(500).json({ error: 'InternalServerError', message: 'Something went wrong' });
}
