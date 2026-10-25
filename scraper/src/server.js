import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { TtlCache } from './cache.js';
import { loadConfig } from './config.js';
import { createMarketService } from './market-service.js';
import { createPoliteFetcher } from './polite-fetch.js';
import { createSource } from './sources/index.js';

const NAME_RE = /^[\p{L}\p{N} .\-+]{1,40}$/u; // lettres, chiffres, espace, . - +  (rien d'exotique)

function send(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extraHeaders });
  res.end(JSON.stringify(body));
}

export function createServer({ config, getMarket }) {
  return http.createServer(async (req, res) => {
    // CORS : n'autorise que l'origine du frontend. (Avec le proxy Angular, il n'est même pas utilisé.)
    const origin = req.headers.origin;
    const cors = {
      vary: 'Origin',
      ...(origin && origin === config.allowedOrigin
        ? {
            'access-control-allow-origin': origin,
            'access-control-allow-methods': 'GET, OPTIONS',
            'access-control-allow-headers': 'content-type',
          }
        : {}),
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      return res.end();
    }
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, cors);

    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname === '/api/health') {
      return send(res, 200, { status: 'ok', source: config.source }, cors);
    }

    if (url.pathname === '/api/market') {
      const brand = (url.searchParams.get('brand') ?? '').trim();
      const model = (url.searchParams.get('model') ?? '').trim();
      const minYearRaw = url.searchParams.get('minYear');
      const minYear = minYearRaw === null ? undefined : Number(minYearRaw);

      if (!NAME_RE.test(brand) || !NAME_RE.test(model)) {
        return send(res, 400, { error: 'brand and model are required (1-40 plain characters)' }, cors);
      }
      if (minYear !== undefined && !(Number.isInteger(minYear) && minYear >= 1990 && minYear <= 2100)) {
        return send(res, 400, { error: 'minYear must be a year between 1990 and 2100' }, cors);
      }

      try {
        const result = await getMarket({ brand, model, minYear });
        return send(res, 200, result, { ...cors, 'cache-control': 'public, max-age=300' });
      } catch (error) {
        console.error(`[market] ${brand} ${model}: ${error.message}`);
        // 502 = « le serveur d'en face (le site source) ne répond pas comme prévu »
        return send(res, 502, { error: 'Market data is temporarily unavailable' }, cors);
      }
    }

    return send(res, 404, { error: 'Not found' }, cors);
  });
}

export function buildApp(env = process.env) {
  const config = loadConfig(env);
  const fetcher = createPoliteFetcher(config);
  const source = createSource(config, fetcher);
  const cache = new TtlCache(config.cacheTtlMs);
  const getMarket = createMarketService({ source, cache, config });
  return { config, source, server: createServer({ config, getMarket }) };
}

// Lancement direct : `node src/server.js`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { config, source, server } = buildApp();
  server.listen(config.port, () => {
    console.log(`Showroom scraper on http://localhost:${config.port}  (source: ${source.id}, mode: ${source.mode})`);
    if (source.mode === 'mock') console.log('Demo data only: no website is contacted. See README to enable live mode.');
    else console.log(`LIVE: ${source.id} will be contacted politely (robots.txt, 2 s between requests, 6 h cache).`);
  });
}
