export type SortKey = 'default' | 'price-asc' | 'price-desc' | 'power-desc';


export interface AutoFilters {

  query: string;

  maxPrice: number;

  minPower: number;
  sort: SortKey;
}

export const DEFAULT_FILTERS: AutoFilters = {
  query: '',
  maxPrice: 0,
  minPower: 0,
  sort: 'default',
};
