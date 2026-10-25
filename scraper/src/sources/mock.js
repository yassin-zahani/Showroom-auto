/**
 * Source de DÉMONSTRATION : aucune requête réseau. Les données sont fabriquées de façon
 * déterministe à partir du nom (même voiture → mêmes chiffres), pour développer le frontend
 * sans dépendre d'un site tiers.
 */
import { searchUrl } from './automobile-tn.js';

export const id = 'demo data';
export const mode = 'mock';

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMockSource({ now = () => new Date() } = {}) {
  return {
    id,
    mode,
    currency: 'TND',
    comparable: true,
    usesYear: true,
    bounds: [5_000, 5_000_000],
    requiresOptIn: false,
    // Le lien, lui, est réel : il ouvre la vraie recherche du site pour comparer à la main.
    searchUrl: (query) => searchUrl(query),
    async fetchListings({ brand, model }) {
      const rnd = mulberry32(hash(`${brand}|${model}`.toLowerCase()));
      const thisYear = now().getFullYear();
      const base = 120_000 + Math.floor(rnd() * 200) * 1000;

      return Array.from({ length: 14 }, (_, i) => {
        // Les 4 premières annonces sont récentes : garantit un échantillon exploitable.
        const age = i < 4 ? [0, 1, 1, 2][i] : Math.floor(rnd() * 8);
        const price = Math.round((base * (1 - age * 0.07) * (0.92 + rnd() * 0.16)) / 500) * 500;
        return {
          id: `demo-${i}`,
          title: `${brand} ${model}`,
          price,
          year: thisYear - age,
          km: age * 18_000 + Math.floor(rnd() * 15_000),
          fiscalPower: null,
          url: '',
        };
      });
    },
  };
}
