import { PostJsonOptions } from '../types';
import { logger } from '../utils/logger';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function postJson<T>(
  url: string,
  body: unknown,
  options: PostJsonOptions,
): Promise<T> {
  const { timeoutMs, retries, retryBackoffMs } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          throw new RetryableError(`Provider responded ${response.status}`);
        }
        throw new Error(`Provider responded with HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      const retryable = isRetryable(error);
      if (attempt < retries && retryable) {
        const backoff = retryBackoffMs * 2 ** attempt;
        logger.warn(
          {
            url,
            attempt: attempt + 1,
            backoffMs: backoff,
            error: errorMessage(error),
          },
          'provider request failed, retrying',
        );
        await sleep(backoff);
        continue;
      }
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`Request to ${url} failed: ${errorMessage(lastError)}`);
}

class RetryableError extends Error {}

function isRetryable(error: unknown): boolean {
  if (error instanceof RetryableError) return true;
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.name === 'TypeError';
  }
  return false;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
