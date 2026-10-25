import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAllowed, parseRobots } from '../src/robots.js';

const TXT = `
# exemple
User-agent: *
Disallow: /mon-espace/
Disallow: /*?sort=
Allow: /fr/occasion/
Disallow: /fr/occasion/recherche$

User-agent: BadBot
Disallow: /
`;

const groups = parseRobots(TXT);

test('allows ordinary paths and blocks disallowed ones', () => {
  assert.equal(isAllowed(groups, 'showroomautobot', '/fr/occasion/s=brand!:audi@model!:q5/1'), true);
  assert.equal(isAllowed(groups, 'showroomautobot', '/mon-espace/mes-favoris'), false);
});

test('supports * wildcards and $ end anchors', () => {
  assert.equal(isAllowed(groups, 'showroomautobot', '/liste?sort=prix'), false);
  assert.equal(isAllowed(groups, 'showroomautobot', '/fr/occasion/recherche'), false);
  assert.equal(isAllowed(groups, 'showroomautobot', '/fr/occasion/recherche/avancee'), true);
});

test('the most specific (longest) rule wins; Allow beats Disallow on a tie', () => {
  const g = parseRobots('User-agent: *\nDisallow: /a/\nAllow: /a/b/');
  assert.equal(isAllowed(g, 'x', '/a/b/c'), true);
  assert.equal(isAllowed(g, 'x', '/a/z'), false);
  const tie = parseRobots('User-agent: *\nDisallow: /p\nAllow: /p');
  assert.equal(isAllowed(tie, 'x', '/p'), true);
});

test('a group naming our bot overrides the * group', () => {
  assert.equal(isAllowed(groups, 'badbot', '/fr/occasion/audi'), false);
});

test('an empty robots.txt allows everything', () => {
  assert.equal(isAllowed(parseRobots(''), 'x', '/anything'), true);
});
