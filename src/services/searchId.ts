import { SearchQuery } from '../types';

export function sliceKey(providerName: string, query: SearchQuery, size: number): string {
  return `${providerName}:${query.ski_site}:${query.from_date}:${query.to_date}:${size}`;
}

export function encodeSearchId(query: SearchQuery): string {
  const canonical = JSON.stringify({
    ski_site: query.ski_site,
    from_date: query.from_date,
    to_date: query.to_date,
    group_size: query.group_size,
  });
  return Buffer.from(canonical, 'utf8').toString('base64url');
}

export function decodeSearchId(id: string): SearchQuery {
  let parsed: unknown;
  try {
    const json = Buffer.from(id, 'base64url').toString('utf8');
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidSearchIdError(id);
  }

  if (!isSearchQuery(parsed)) {
    throw new InvalidSearchIdError(id);
  }
  return parsed;
}

export class InvalidSearchIdError extends Error {
  constructor(id: string) {
    super(`Invalid search id: "${id}"`);
    this.name = 'InvalidSearchIdError';
  }
}

function isSearchQuery(value: unknown): value is SearchQuery {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.ski_site === 'number' &&
    typeof v.from_date === 'string' &&
    typeof v.to_date === 'string' &&
    typeof v.group_size === 'number'
  );
}
