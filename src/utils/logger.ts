import pino from 'pino';
import { config } from '../config';

export const logger = pino(
  config.log.pretty
    ? { level: config.log.level, transport: { target: 'pino-pretty' } }
    : { level: config.log.level },
);
