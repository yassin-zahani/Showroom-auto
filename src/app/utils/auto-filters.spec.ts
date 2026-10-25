import { Auto } from '../interfaces/auto';
import { DEFAULT_FILTERS } from '../interfaces/auto-filters';
import { applyFilters, normalizeText } from './auto-filters';

const car = (id: number, brand: string, model: string, price: number, power: number): Auto => ({
  id, brand, model, price, power, photo: '', availability: 1, description: '',
});

const CARS = [
  car(1, 'Mercedes Benz', 'C-CLASS', 230, 9),
  car(2, 'Audi', 'Q5', 350, 16),
  car(3, 'Audi', 'Q3 CROSSBACK', 260, 12),
  car(4, 'Range Rover', 'Evoque', 400, 14),
];

describe('applyFilters', () => {
  it('returns everything with the default filters', () => {
    expect(applyFilters(CARS, DEFAULT_FILTERS)).toEqual(CARS);
  });

  it('matches brand OR model, ignoring case and accents', () => {
    expect(applyFilters(CARS, { ...DEFAULT_FILTERS, query: 'AUDI' }).map((c) => c.id)).toEqual([2, 3]);
    expect(applyFilters(CARS, { ...DEFAULT_FILTERS, query: 'evoqué' }).map((c) => c.id)).toEqual([4]);
  });

  it('requires every word of the query to match', () => {
    expect(applyFilters(CARS, { ...DEFAULT_FILTERS, query: 'audi q5' }).map((c) => c.id)).toEqual([2]);
    expect(applyFilters(CARS, { ...DEFAULT_FILTERS, query: 'audi mercedes' })).toEqual([]);
  });

  it('applies budget (0 = no limit) and minimum power together', () => {
    expect(applyFilters(CARS, { ...DEFAULT_FILTERS, maxPrice: 300 }).map((c) => c.id)).toEqual([1, 3]);
    expect(applyFilters(CARS, { ...DEFAULT_FILTERS, maxPrice: 300, minPower: 12 }).map((c) => c.id)).toEqual([3]);
  });

  it('sorts without mutating the input', () => {
    const copy = [...CARS];
    expect(applyFilters(CARS, { ...DEFAULT_FILTERS, sort: 'price-desc' }).map((c) => c.id)).toEqual([4, 2, 3, 1]);
    expect(applyFilters(CARS, { ...DEFAULT_FILTERS, sort: 'power-desc' }).map((c) => c.id)).toEqual([2, 4, 3, 1]);
    expect(CARS).toEqual(copy);
  });
});

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('  Citroën ÉVOQUE ')).toBe('citroen evoque');
  });
});
