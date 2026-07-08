export interface SkiSite {
  id: number;
  name: string;
}

export const SKI_SITES: SkiSite[] = [
  { id: 1, name: 'Val Thorens' },
  { id: 2, name: 'Courchevel' },
  { id: 3, name: 'Tignes' },
  { id: 4, name: 'La Plagne' },
  { id: 5, name: 'Chamonix' },
];

const SKI_SITE_IDS = new Set(SKI_SITES.map((site) => site.id));

export function isKnownSkiSite(id: number): boolean {
  return SKI_SITE_IDS.has(id);
}
