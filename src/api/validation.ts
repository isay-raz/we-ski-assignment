import { z } from 'zod';
import { isKnownSkiSite } from '../types/skiSites';

const DATE_REGEX = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

function parseDate(value: string): Date | null {
  if (!DATE_REGEX.test(value)) return null;
  const [month, day, year] = value.split('/').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export const searchRequestSchema = z
  .object({
    ski_site: z
      .number()
      .int()
      .positive()
      .refine((v) => isKnownSkiSite(v), { message: 'ski_site must be a known ski resort id' }),
    from_date: z.string().refine((v) => parseDate(v) !== null, {
      message: 'from_date must be a valid date in MM/DD/YYYY format',
    }),
    to_date: z.string().refine((v) => parseDate(v) !== null, {
      message: 'to_date must be a valid date in MM/DD/YYYY format',
    }),
    group_size: z.number().int().positive(),
  })
  .refine(
    (data) => {
      const from = parseDate(data.from_date);
      const to = parseDate(data.to_date);
      return from !== null && to !== null && from.getTime() < to.getTime();
    },
    { message: 'from_date must be before to_date', path: ['to_date'] },
  );

export type SearchRequest = z.infer<typeof searchRequestSchema>;
