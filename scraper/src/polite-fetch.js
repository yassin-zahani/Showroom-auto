import { isAllowed, parseRobots } from './robots.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Un « fetch » avec des bonnes manières :
 *  1. il lit le robots.txt du site (une fois) et REFUSE ce qui est interdit ;
 *  2. il laisse au moins `minDelayMs` entre deux requêtes vers le même site ;
 *  3. il s'identifie (User-Agent) et abandonne après `timeoutMs` ;
 *  4. il refuse de continuer si le robots.txt est injoignable (prudence).
 */
export function createPoliteFetcher({ userAgent, minDelayMs, timeoutMs, fetchImpl = fetch }) {
  const robotsByOrigin = new Map(); // origin → Promise<groups | null>
  const lastCallByOrigin = new Map(); // origin → timestamp
  const agentToken = userAgent.split(/[\s/]/)[0].toLowerCase();

  async function rawGet(url) {
    return fetchImpl(url, {
      headers: { 'user-agent': userAgent, accept: 'text/html,text/plain;q=0.9' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
  }

  function loadRobots(origin) {
    if (!robotsByOrigin.has(origin)) {
      robotsByOrigin.set(
        origin,
        (async () => {
          const res = await rawGet(`${origin}/robots.txt`);
          if (res.status === 404 || res.status === 410) return []; // pas de robots.txt = tout est permis
          if (!res.ok) return null; // 401/403/5xx : on ne prend pas le risque
          return parseRobots(await res.text());
        })().catch(() => null),
      );
    }
    return robotsByOrigin.get(origin);
  }

  async function throttle(origin) {
    const wait = (lastCallByOrigin.get(origin) ?? 0) + minDelayMs - Date.now();
    lastCallByOrigin.set(origin, Date.now() + Math.max(wait, 0));
    if (wait > 0) await sleep(wait);
  }

  return {
    async fetchText(url) {
      const { origin, pathname, search } = new URL(url);

      const robots = await loadRobots(origin);
      if (robots === null) throw new Error(`robots.txt of ${origin} could not be read: not scraping`);
      if (!isAllowed(robots, agentToken, pathname + search)) {
        throw new Error(`robots.txt of ${origin} disallows ${pathname}`);
      }

      await throttle(origin);
      const res = await rawGet(url);
      if (!res.ok) throw new Error(`${origin} answered HTTP ${res.status}`);
      return res.text();
    },
  };
}
