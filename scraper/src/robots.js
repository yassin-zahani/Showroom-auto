/**
 * Lecteur minimal de robots.txt (RFC 9309) : groupes par User-agent,
 * règles Allow/Disallow avec jokers `*` et `$`, la règle la plus spécifique l'emporte.
 */

export function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === 'allow' || field === 'disallow') && current) {
      current.rules.push({ allow: field === 'allow', pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function patternToRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + escaped.replace(/\\\$$/, '$'));
}

/** `agentToken` : la partie « nom » de notre User-Agent, ex. « showroomautobot ». */
export function isAllowed(groups, agentToken, path) {
  const token = agentToken.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && token.includes(a)));
  const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  const rules = applicable.flatMap((g) => g.rules).filter((r) => r.pattern !== '');

  let best = null;
  for (const rule of rules) {
    if (!patternToRegExp(rule.pattern).test(path)) continue;
    const longer = !best || rule.pattern.length > best.pattern.length;
    const tieAllow = best && rule.pattern.length === best.pattern.length && rule.allow && !best.allow;
    if (longer || tieAllow) best = rule;
  }
  return best ? best.allow : true; // aucune règle ne s'applique → autorisé
}
