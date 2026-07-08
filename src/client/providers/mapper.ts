import { Accommodation, RawAccommodation, RawImage } from '../../types';

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickMainImage(images: RawImage[]): string | null {
  const main = images.find((img) => img.MainImage === 'True' && img.URL);
  if (main?.URL) return main.URL;
  const firstWithUrl = images.find((img) => img.URL);
  return firstWithUrl?.URL ?? null;
}

export function mapAccommodation(
  raw: RawAccommodation,
  capacity: number,
  providerName: string,
): Accommodation {
  const images = raw.HotelDescriptiveContent?.Images ?? [];
  const position = raw.HotelInfo?.Position;

  return {
    hotelCode: raw.HotelCode,
    hotelName: raw.HotelName,
    images: {
      main: pickMainImage(images),
      all: images.map((img) => img.URL).filter((url): url is string => Boolean(url)),
    },
    location: {
      latitude: toNumber(position?.Latitude),
      longitude: toNumber(position?.Longitude),
      distances: (position?.Distances ?? []).map((d) => ({
        type: d.type,
        distance: d.distance,
      })),
    },
    rating: toNumber(raw.HotelInfo?.Rating),
    beds: toNumber(raw.HotelInfo?.Beds),
    price: {
      afterTax: toNumber(raw.PricesInfo?.AmountAfterTax),
      beforeTax: toNumber(raw.PricesInfo?.AmountBeforeTax),
    },
    capacity,
    provider: providerName,
  };
}
