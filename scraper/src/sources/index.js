import { readFileSync } from 'node:fs';
import { createAutomobileTnSource } from './automobile-tn.js';
import { createCssSource } from './css-source.js';
import { createMockSource } from './mock.js';

function loadCustomSources(file) {
  try {
    const all = JSON.parse(readFileSync(file, 'utf8'));
    return Object.fromEntries(Object.entries(all).filter(([key]) => !key.startsWith('_')));
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${error.message}`);
  }
}

/**
 * Choisit la source selon SCRAPER_SOURCE :
 *   mock           données fabriquées, aucun réseau (par défaut)
 *   automobile-tn  parseur dédié (voir son fichier et le README : conditions d'utilisation)
 *   <autre>        n'importe quelle entrée de sources.config.json (books-demo, ou la tienne)
 *
 * Tayara n'est volontairement PAS branché : ses conditions d'utilisation réservent le contenu
 * à « une utilisation normale du site ». Obtiens d'abord leur accord écrit.
 */
export function createSource(config, fetcher) {
  if (config.source === 'mock') return createMockSource();

  const custom = loadCustomSources(config.sourcesFile);
  let source;

  if (config.source === 'automobile-tn') {
    source = createAutomobileTnSource(fetcher);
  } else if (custom[config.source]) {
    source = createCssSource(config.source, custom[config.source], fetcher);
  } else {
    const known = ['mock', 'automobile-tn', ...Object.keys(custom)].join(', ');
    throw new Error(`Unknown SCRAPER_SOURCE "${config.source}". Available: ${known}`);
  }

  if (source.requiresOptIn && !config.allowLive) {
    throw new Error(
      `${source.id} demande ALLOW_LIVE_SCRAPING=yes : relis d'abord les conditions d'utilisation du site.`,
    );
  }
  return source;
}
