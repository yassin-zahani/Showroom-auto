export interface MarketStats {
  source: string;
  sourceUrl: string;
  mode: 'mock' | 'live';
  currency: string;
  comparable: boolean;
  
  note: string | null;
  brand: string;
  model: string;
  minYear: number | null;
  count: number;
  min?: number;
  median?: number;
  max?: number;
  fetchedAt: string;
  cached: boolean;
}

export type MarketState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty'; stats: MarketStats }
  | { status: 'ready'; stats: MarketStats; showroomPriceTnd: number };
