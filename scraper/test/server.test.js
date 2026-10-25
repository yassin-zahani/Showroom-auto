import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { buildApp } from '../src/server.js';

let server;
let base;

before(async () => {
  ({ server } = buildApp({ SCRAPER_SOURCE: 'mock', ALLOWED_ORIGIN: 'http://localhost:4200' }));
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const get = (path, headers = {}) => fetch(base + path, { headers });

test('GET /api/health', async () => {
  const res = await get('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok', source: 'mock' });
});

test('GET /api/market returns aggregated stats flagged as demo data', async () => {
  const res = await get('/api/market?brand=Audi&model=Q5');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.mode, 'mock');
  assert.equal(body.brand, 'Audi');
  assert.ok(body.count >= 3, 'enough recent listings for a meaningful median');
  assert.ok(body.min <= body.median && body.median <= body.max);
  assert.equal(body.currency, 'TND');
  assert.equal(body.comparable, true);
  assert.equal(body.sourceUrl, 'https://www.automobile.tn/fr/occasion/s=brand!:audi@model!:q5/1');
  assert.equal(body.cached, false);
  assert.equal('listings' in body, false, 'individual listings are never exposed');
});

test('a second identical call is served from the cache', async () => {
  await get('/api/market?brand=BMW&model=X2');
  const body = await (await get('/api/market?brand=BMW&model=X2')).json();
  assert.equal(body.cached, true);
});

test('every showroom car yields a usable sample in demo mode', async () => {
  const cars = [['Mercedes Benz', 'C-CLASS'], ['Range Rover', 'Evoque'], ['Audi', 'Q3 CROSSBACK'], ['BMW', 'X3 HYBRIDE'], ['Jaguar', 'F-PACE']];
  for (const [brand, model] of cars) {
    const body = await (await get(`/api/market?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`)).json();
    assert.ok(body.count >= 3, `${brand} ${model}: count=${body.count}`);
  }
});

test('rejects missing or suspicious parameters with 400', async () => {
  assert.equal((await get('/api/market?brand=Audi')).status, 400);
  assert.equal((await get('/api/market?brand=%3Cscript%3E&model=Q5')).status, 400);
  assert.equal((await get('/api/market?brand=Audi&model=Q5&minYear=abc')).status, 400);
});

test('CORS: allows only the configured origin', async () => {
  const ok = await get('/api/health', { origin: 'http://localhost:4200' });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:4200');
  const other = await get('/api/health', { origin: 'https://evil.example' });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
  const pre = await fetch(base + '/api/market', { method: 'OPTIONS', headers: { origin: 'http://localhost:4200' } });
  assert.equal(pre.status, 204);
});

test('unknown routes → 404, wrong method → 405', async () => {
  assert.equal((await get('/nope')).status, 404);
  assert.equal((await fetch(base + '/api/market', { method: 'POST' })).status, 405);
});

test('live mode refuses to start without the explicit opt-in', () => {
  assert.throws(() => buildApp({ SCRAPER_MODE: 'live' }), /ALLOW_LIVE_SCRAPING=yes/);
});
