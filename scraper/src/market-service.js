import { summarize } from './stats.js';

/**
 * Orchestre : cache → source → statistiques.
 * Le résultat ne contient QUE des chiffres agrégés et un lien vers la source :
 * on n'expose ni le texte des annonces, ni les vendeurs, ni leurs coordonnées.
 */
export function createMarketService({ source, cache, config, now = () => new Date() }) {
  return async function getMarket({ brand, model, minYear }) {
    // Certaines sources (livres, meubles…) n'ont pas d'année : le filtre ne s'applique pas.
    const year = source.usesYear ? (minYear ?? now().getFullYear() - config.recentYears) : null;
    const key = `${source.id}|${brand}|${model}|${year}`.toLowerCase();

    const { value, cached } = await cache.getOrLoad(key, async () => {
      const listings = await source.fetchListings({ brand, model });
      return {
        source: source.id,
        sourceUrl: source.searchUrl({ brand, model }),
        mode: source.mode,
        currency: source.currency,
        comparable: source.comparable,
        note: source.note ?? null,
        brand,
        model,
        minYear: year,
        ...summarize(listings, { minYear: year ?? undefined, bounds: source.bounds }),
        fetchedAt: now().toISOString(),
      };
    });

    return { ...value, cached };
  };
}
