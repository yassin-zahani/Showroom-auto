import { DomUtils, parseDocument } from 'htmlparser2';
import { findPricesTnd } from '../stats.js';
import { toSiteSlugs } from './slugs.js';

/**
 * Source « automobile.tn » (occasions). Observé le 24/10/2026 : pages de résultats rendues
 * côté serveur, une carte par annonce, avec <h2> (titre), <li> (km, année, cv) et un prix « 138 000 DT ».
 *
 * Stratégie anti-fragilité : on ne s'appuie PAS sur des noms de classes CSS (qui changent
 * à chaque refonte) mais sur deux choses stables : le SCHÉMA DES URL de fiche
 * (…/audi/q5/130816) et le FORMAT DES TEXTES (« 138 000 DT », « 2023 », « 78 000 km »).
 *
 * Données personnelles : on ne lit JAMAIS la description ni le vendeur (numéros de téléphone).
 */
export const id = 'automobile.tn';
export const mode = 'live';

const ORIGIN = 'https://www.automobile.tn';
const DETAIL_HREF =
  /^(?:https?:\/\/[^/]+)?\/fr\/occasion\/(?:[^?#]*\/)?([a-z0-9-]+)\/([a-z0-9-]+)\/(\d+)\/?(?:[?#].*)?$/i;

export function searchUrl({ brand, model }, page = 1) {
  const slugs = toSiteSlugs(brand, model);
  return `${ORIGIN}/fr/occasion/s=brand!:${slugs.brand}@model!:${slugs.model}/${page}`;
}

const isTag = (node) => node.type === 'tag';
const text = (node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim();

function detailIdsInside(node) {
  const ids = new Set();
  for (const a of DomUtils.findAll((el) => el.name === 'a', node.children ?? [])) {
    const m = DETAIL_HREF.exec(a.attribs?.href ?? '');
    if (m) ids.add(m[3]);
  }
  return ids;
}

/** Remonte depuis le lien de la fiche jusqu'au plus grand ancêtre qui ne contient QU'UNE annonce. */
function findCard(anchor) {
  let best = null;
  let node = anchor.parent;
  for (let depth = 0; node && isTag(node) && depth < 6; depth += 1, node = node.parent) {
    if (detailIdsInside(node).size > 1) break; // on a atteint le conteneur de la liste
    if (text(node).length > 4000) break;
    best = node;
  }
  return best;
}

/** HTML → [{ id, title, price (en DT), year, km, fiscalPower, url }] */
export function parseListings(html, baseUrl = ORIGIN) {
  const doc = parseDocument(html);
  const anchors = DomUtils.findAll(
    (el) => el.name === 'a' && DETAIL_HREF.test(el.attribs?.href ?? ''),
    doc.children,
  );

  const seen = new Set();
  const listings = [];

  for (const anchor of anchors) {
    const listingId = DETAIL_HREF.exec(anchor.attribs.href)[3];
    if (seen.has(listingId)) continue;
    seen.add(listingId);

    const card = findCard(anchor);
    if (!card) continue;

    // Le badge de prix est le DERNIER prix de la carte (la description en cite parfois un autre avant).
    const prices = findPricesTnd(text(card));
    const price = prices.length ? prices[prices.length - 1] : null;
    if (price === null) continue;

    const items = DomUtils.findAll((el) => el.name === 'li', card.children).map(text);
    const year = items.map((t) => /^((?:19|20)\d{2})$/.exec(t)?.[1]).find(Boolean);
    const km = items.map((t) => /^(\d[\d\s.]*)\s*km$/i.exec(t)?.[1]).find(Boolean);
    const cv = items.map((t) => /^(\d{1,2})\s*cv$/i.exec(t)?.[1]).find(Boolean);
    const heading = DomUtils.findOne((el) => /^h[1-4]$/.test(el.name), card.children);

    listings.push({
      id: listingId,
      title: heading ? text(heading) : '',
      price,
      year: year ? Number(year) : null,
      km: km ? Number(km.replace(/[\s.]/g, '')) : null,
      fiscalPower: cv ? Number(cv) : null,
      url: new URL(anchor.attribs.href, baseUrl).href,
    });
  }
  return listings;
}

export function createAutomobileTnSource(fetcher) {
  return {
    id,
    mode,
    currency: 'TND',
    comparable: true, // des dinars comparés à des dinars
    usesYear: true,
    bounds: [5_000, 5_000_000],
    requiresOptIn: true, // conditions d'utilisation du site : voir README
    searchUrl: (query) => searchUrl(query),
    async fetchListings(query) {
      // Une seule page (≈16 annonces) suffit pour une médiane et reste très discret.
      const html = await fetcher.fetchText(searchUrl(query, 1));
      return parseListings(html);
    },
  };
}
