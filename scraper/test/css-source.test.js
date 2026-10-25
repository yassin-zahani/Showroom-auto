import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { after, before, test } from 'node:test';
import { TtlCache } from '../src/cache.js';
import { createMarketService } from '../src/market-service.js';
import { createPoliteFetcher } from '../src/polite-fetch.js';
import { parseWithSelectors, createCssSource } from '../src/sources/css-source.js';
import { createSource } from '../src/sources/index.js';
import { loadConfig } from '../src/config.js';

// Structure de books.toscrape.com (site-bac-à-sable fait pour être scrapé).
const book = (slug, title, price) => `
  <li class="col-xs-6 col-sm-4 col-md-3 col-lg-3">
    <article class="product_pod">
      <div class="image_container"><a href="${slug}/index.html"><img alt="${title}" src="../media/x.jpg"></a></div>
      <p class="star-rating Three"><i class="icon-star"></i></p>
      <h3><a href="${slug}/index.html" title="${title}">${title.slice(0, 18)}...</a></h3>
      <div class="product_price"><p class="price_color">${price}</p><p class="instock availability">In stock</p></div>
    </article>
  </li>`;
const PAGE_1 = `<html><body><ol class="row">
  ${book('a-light-in-the-attic_1000', 'A Light in the Attic', '£51.77')}
  ${book('tipping-the-velvet_999', 'Tipping the Velvet', '£53.74')}
  ${book('soumission_998', 'Soumission', '£50.10')}
  </ol></body></html>`;
const PAGE_2 = `<html><body><ol class="row">
  ${book('sharp-objects_997', 'Sharp Objects', '£47.82')}
  <li><article class="product_pod"><h3><a href="x/index.html" title="No price here">x</a></h3></article></li>
  </ol></body></html>`;

const DEFINITION = {
  label: 'books.toscrape.com', currency: 'GBP', note: 'practice', pages: 2, priceBounds: [1, 1000],
  urlTemplate: 'BASE/catalogue/page-{page}.html', item: 'article.product_pod',
  title: { selector: 'h3 a', attr: 'title' }, price: '.price_color', link: { selector: 'h3 a', attr: 'href' },
};

test('parseWithSelectors extracts title (attribute), price and absolute link; skips cards without price', () => {
  const rows = parseWithSelectors(PAGE_1, DEFINITION, 'https://books.toscrape.com/catalogue/page-1.html');
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    title: 'A Light in the Attic',
    price: 51.77,
    year: null,
    url: 'https://books.toscrape.com/catalogue/page-1.html'.replace('page-1.html', 'a-light-in-the-attic_1000/index.html'),
  });
  assert.equal(parseWithSelectors(PAGE_2, DEFINITION, 'https://x.test/').length, 1, 'carte sans prix ignorée');
});

test('year selector feeds the year field', () => {
  const html = '<div class="ad"><span class="p">12 500 €</span><span class="y">Mise en circulation 03/2022</span></div>';
  const [row] = parseWithSelectors(html, { item: '.ad', price: '.p', year: '.y' }, 'https://x.test/');
  assert.deepEqual([row.price, row.year], [12500, 2022]);
});

// ---- bout en bout, SANS Internet : un faux site local + robots.txt, de vrais fetcher/cache/stats ----
let site, base, hits;
before(async () => {
  hits = [];
  site = createHttpServer((req, res) => {
    hits.push(req.url);
    const send = (status, body, type = 'text/html; charset=utf-8') => { res.writeHead(status, { 'content-type': type }); res.end(body); };
    if (req.url === '/robots.txt') return send(200, 'User-agent: *\nDisallow: /private/', 'text/plain');
    if (req.url === '/catalogue/page-1.html') return send(200, PAGE_1);
    if (req.url === '/catalogue/page-2.html') return send(200, PAGE_2);
    return send(404, 'nope');
  });
  await new Promise((r) => site.listen(0, r));
  base = `http://localhost:${site.address().port}`;
});
after(() => site.close());

const fetcher = () => createPoliteFetcher({ userAgent: 'ShowroomAutoBot/1.0 (test)', minDelayMs: 0, timeoutMs: 2000 });

test('end to end: fetch 2 pages politely → parse → cache → stats in pounds, flagged as not comparable', async () => {
  const source = createCssSource('books-demo', { ...DEFINITION, urlTemplate: DEFINITION.urlTemplate.replace('BASE', base) }, fetcher());
  const getMarket = createMarketService({ source, cache: new TtlCache(60_000), config: { recentYears: 2 } });

  const first = await getMarket({ brand: 'Audi', model: 'Q5' });
  assert.equal(first.count, 4);
  assert.equal(first.currency, 'GBP');
  assert.equal(first.comparable, false);
  assert.equal(first.minYear, null, 'no year concept → no year filter');
  assert.deepEqual([first.min, first.median, first.max], [47.82, 50.94, 53.74]);
  assert.equal(first.note, 'practice');
  assert.equal(first.cached, false);

  const before = hits.length;
  const second = await getMarket({ brand: 'Audi', model: 'Q5' });
  assert.equal(second.cached, true);
  assert.equal(hits.length, before, 'second call: zero request to the site');
  assert.ok(hits.includes('/robots.txt'), 'robots.txt was read first');
});

test('a path disallowed by robots.txt is never requested', async () => {
  const source = createCssSource('x', { ...DEFINITION, urlTemplate: `${base}/private/page-{page}.html` }, fetcher());
  await assert.rejects(source.fetchListings({ brand: 'a', model: 'b' }), /disallows/);
  assert.ok(!hits.includes('/private/page-1.html'));
});

test('the source registry knows books-demo, protects opt-in sources and explains unknown names', () => {
  const cfg = (env) => loadConfig(env);
  const books = createSource(cfg({ SCRAPER_SOURCE: 'books-demo' }), fetcher());
  assert.equal(books.currency, 'GBP');
  assert.equal(books.requiresOptIn, false, 'practice site made for scraping: no opt-in');

  assert.throws(() => createSource(cfg({ SCRAPER_SOURCE: 'automobile-tn' }), fetcher()), /ALLOW_LIVE_SCRAPING=yes/);
  assert.equal(createSource(cfg({ SCRAPER_SOURCE: 'automobile-tn', ALLOW_LIVE_SCRAPING: 'yes' }), fetcher()).currency, 'TND');
  assert.throws(() => createSource(cfg({ SCRAPER_SOURCE: 'nope' }), fetcher()), /Available: mock, automobile-tn, books-demo/);
  assert.equal(createSource(cfg({}), fetcher()).mode, 'mock');
  // l'ancienne variable continue de fonctionner
  assert.throws(() => createSource(cfg({ SCRAPER_MODE: 'live' }), fetcher()), /ALLOW_LIVE_SCRAPING=yes/);
});

test('template entries (keys starting with _) are ignored, and a definition missing a field is rejected clearly', () => {
  assert.throws(() => createSource(loadConfig({ SCRAPER_SOURCE: '_template-your-site' }), fetcher()), /Unknown SCRAPER_SOURCE/);
  assert.throws(() => createCssSource('broken', { item: '.x' }, fetcher()), /"urlTemplate" est obligatoire/);
});
