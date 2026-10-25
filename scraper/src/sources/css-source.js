import { selectAll, selectOne } from 'css-select';
import { DomUtils, parseDocument } from 'htmlparser2';
import { parseMoney } from '../stats.js';

/**
 * Source GÉNÉRIQUE : on décrit un site dans sources.config.json avec des sélecteurs CSS
 * (les mêmes que dans l'inspecteur du navigateur), sans écrire de code.
 *
 *   item       sélecteur d'UNE annonce/fiche dans la page          ex. "article.product_pod"
 *   price      sélecteur du prix, DANS l'annonce                   ex. ".price_color"
 *   title      (facultatif) texte, ou { selector, attr }           ex. { "selector": "h3 a", "attr": "title" }
 *   link       (facultatif) { selector, attr: "href" }
 *   year       (facultatif) sélecteur d'un texte contenant l'année
 */
const textOf = (node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim();

function read(root, spec) {
  if (!spec) return null;
  const { selector, attr } = typeof spec === 'string' ? { selector: spec } : spec;
  const element = selector ? selectOne(selector, root) : root;
  if (!element) return null;
  return attr ? (element.attribs?.[attr] ?? null) : textOf(element);
}

/** HTML + description du site → [{ title, price, year, url }] (fonction pure, testable sans réseau) */
export function parseWithSelectors(html, definition, baseUrl) {
  const doc = parseDocument(html);
  const listings = [];

  for (const card of selectAll(definition.item, doc)) {
    const price = parseMoney(read(card, definition.price) ?? '');
    if (price === null) continue; // pas de prix lisible : on ignore cette carte

    const yearText = read(card, definition.year);
    const year = yearText ? /(?:19|20)\d{2}/.exec(yearText)?.[0] : undefined;
    const href = read(card, definition.link);

    listings.push({
      title: read(card, definition.title) ?? '',
      price,
      year: year ? Number(year) : null,
      url: href ? new URL(href, baseUrl).href : '',
    });
  }
  return listings;
}

const MAX_PAGES = 3; // plafond de politesse, quelle que soit la config

export function createCssSource(name, definition, fetcher) {
  for (const key of ['urlTemplate', 'item', 'price', 'currency']) {
    if (!definition[key]) throw new Error(`sources.config.json › "${name}" : le champ "${key}" est obligatoire`);
  }

  const urlFor = ({ brand, model }, page) =>
    definition.urlTemplate
      .replaceAll('{page}', String(page))
      .replaceAll('{query}', encodeURIComponent(`${brand} ${model}`))
      .replaceAll('{brand}', encodeURIComponent(brand))
      .replaceAll('{model}', encodeURIComponent(model));

  return {
    id: definition.label ?? name,
    mode: 'live',
    currency: definition.currency,
    // On ne compare au prix du showroom que des dinars à des dinars.
    comparable: definition.currency === 'TND' && definition.comparable !== false,
    note: definition.note,
    usesYear: Boolean(definition.year),
    bounds: definition.priceBounds ?? [0, 1e12],
    requiresOptIn: Boolean(definition.requiresOptIn),
    searchUrl: (query) => definition.humanUrl ?? urlFor(query, 1),

    async fetchListings(query) {
      const pages = Math.min(definition.pages ?? 1, MAX_PAGES);
      const listings = [];
      for (let page = 1; page <= pages; page += 1) {
        const url = urlFor(query, page);
        const html = await fetcher.fetchText(url); // robots.txt + délai + timeout
        listings.push(...parseWithSelectors(html, definition, url));
      }
      return listings;
    },
  };
}
