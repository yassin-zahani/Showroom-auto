/** Fonctions PURES (aucune entrée/sortie) : faciles à tester, faciles à raisonner. */

const MIN_PLAUSIBLE_TND = 5_000;
const MAX_PLAUSIBLE_TND = 5_000_000;

// « 138 000 DT », « 149.000 DT », « 49 500 DT », « 125000 TND »
const PRICE_RE = /(\d{1,3}(?:[\s\u00a0\u202f.,]\d{3})+|\d{4,8})\s*(?:DT|TND)\b/gi;

/** Tous les prix trouvés dans un texte, dans l'ordre d'apparition. */
export function findPricesTnd(text) {
  return [...String(text).matchAll(PRICE_RE)]
    .map((m) => Number(m[1].replace(/[\s\u00a0\u202f.,]/g, '')))
    .filter(Number.isFinite);
}

/** Un prix isolé, ex. « 138 000 DT » → 138000 (ou null). */
export function parsePriceTnd(text) {
  const all = findPricesTnd(text);
  return all.length ? all[0] : null;
}

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100; // 2 décimales (£, €, $…)
}

/**
 * Transforme un texte de prix de N'IMPORTE QUEL pays en nombre :
 *   "£51.77" → 51.77      "1 234,50 €" → 1234.5     "$12,345" → 12345
 *   "12.345,67" → 12345.67   "138 000 DT" → 138000   "138.000" → 138000
 * Règle pour un séparateur unique : exactement 3 chiffres derrière → séparateur de milliers.
 */
export function parseMoney(text) {
  const kept = String(text).replace(/[^\d.,\s\u00a0\u202f]/g, '').replace(/[\s\u00a0\u202f]/g, '');
  if (!/\d/.test(kept)) return null;
  const lastDot = kept.lastIndexOf('.');
  const lastComma = kept.lastIndexOf(',');
  let normalized = kept;

  if (lastDot !== -1 && lastComma !== -1) {
    const decimal = lastDot > lastComma ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    normalized = kept.split(thousands).join('').replace(decimal, '.');
  } else if (lastDot !== -1 || lastComma !== -1) {
    const sep = lastDot !== -1 ? '.' : ',';
    const parts = kept.split(sep);
    const thousands = parts.length > 2 || (parts[1].length === 3 && parts[0].length >= 1 && parts[0].length <= 3);
    normalized = thousands ? parts.join('') : parts.join('.');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function quantile(sortedValues, q) {
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedValues[base + 1] ?? sortedValues[base];
  return sortedValues[base] + rest * (next - sortedValues[base]);
}

/**
 * Écarte les prix aberrants (annonce à 1 000 DT, faute de frappe…) avec la règle de l'IQR.
 * En dessous de 4 valeurs, un quartile n'a pas de sens : on ne touche à rien.
 */
export function trimOutliers(values) {
  if (values.length < 4) return [...values];
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  return sorted.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
}

/**
 * listings : [{ price, year }]  →  { count, min, median, max }
 *  - `minYear`  : ne garde que les annonces récentes (une neuve ne se compare pas à une de 2009) ;
 *  - `bounds`   : [plancher, plafond] de vraisemblance, dans la devise de la source.
 */
export function summarize(listings, { minYear, bounds = [MIN_PLAUSIBLE_TND, MAX_PLAUSIBLE_TND] } = {}) {
  const [low, high] = bounds;
  const prices = listings
    .filter((l) => Number.isFinite(l.price) && l.price >= low && l.price <= high)
    .filter((l) => minYear == null || (Number.isFinite(l.year) && l.year >= minYear))
    .map((l) => l.price);

  const kept = trimOutliers(prices);
  if (!kept.length) return { count: 0 };

  return { count: kept.length, min: Math.min(...kept), median: median(kept), max: Math.max(...kept) };
}
