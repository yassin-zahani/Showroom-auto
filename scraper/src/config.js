import { fileURLToPath } from 'node:url';

const num = (value, fallback) => (Number.isFinite(Number(value)) && value !== undefined ? Number(value) : fallback);

export function loadConfig(env = process.env) {
  return {
    port: num(env.PORT, 3000),
    // Quelle source de données ? mock | automobile-tn | books-demo | (une clé de sources.config.json)
    // Ancienne variable SCRAPER_MODE=live conservée : elle équivaut à automobile-tn.
    source: env.SCRAPER_SOURCE ?? (env.SCRAPER_MODE === 'live' ? 'automobile-tn' : 'mock'),
    sourcesFile: env.SOURCES_FILE ?? fileURLToPath(new URL('../sources.config.json', import.meta.url)),
    allowLive: env.ALLOW_LIVE_SCRAPING === 'yes',
    allowedOrigin: env.ALLOWED_ORIGIN ?? 'http://localhost:4200',
    userAgent: env.SCRAPER_USER_AGENT ?? 'ShowroomAutoBot/1.0 (projet pédagogique)',
    cacheTtlMs: num(env.CACHE_TTL_MINUTES, 360) * 60_000,
    // politesse envers les sites : au moins 2 s entre deux requêtes vers le même hôte
    minDelayMs: num(env.MIN_DELAY_MS, 2000),
    timeoutMs: num(env.TIMEOUT_MS, 10_000),
    // « voiture neuve vs occasion » : on ne compare qu'aux annonces des N dernières années
    recentYears: num(env.RECENT_YEARS, 2),
  };
}
