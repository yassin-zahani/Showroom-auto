import { Auto } from '../interfaces/auto';
import { AutoFilters } from '../interfaces/auto-filters';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}


export function applyFilters(autos: readonly Auto[], filters: AutoFilters): Auto[] {
  const tokens = normalizeText(filters.query).split(/\s+/).filter(Boolean);

  const result = autos.filter((auto) => {
    const haystack = normalizeText(`${auto.brand} ${auto.model}`);
    const matchesText = tokens.every((token) => haystack.includes(token));
    const matchesBudget = filters.maxPrice === 0 || auto.price <= filters.maxPrice;
    const matchesPower = auto.power >= filters.minPower;
    return matchesText && matchesBudget && matchesPower;
  });

  switch (filters.sort) {
    case 'price-asc':
      return [...result].sort((a, b) => a.price - b.price);
    case 'price-desc':
      return [...result].sort((a, b) => b.price - a.price);
    case 'power-desc':
      return [...result].sort((a, b) => b.power - a.power);
    default:
      return result;
  }
}
