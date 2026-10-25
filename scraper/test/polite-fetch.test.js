import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPoliteFetcher } from '../src/polite-fetch.js';

const res = (status, body = '') => ({ status, ok: status >= 200 && status < 300, text: async () => body });

function fakeSite(routes) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const path = new URL(url).pathname;
    return routes[path] ?? res(404);
  };
  return { fetchImpl, calls };
}

const options = { userAgent: 'ShowroomAutoBot/1.0 (test)', minDelayMs: 0, timeoutMs: 1000 };

test('fetches an allowed page after reading robots.txt once', async () => {
  const { fetchImpl, calls } = fakeSite({
    '/robots.txt': res(200, 'User-agent: *\nDisallow: /private/'),
    '/fr/a': res(200, '<html>ok</html>'),
    '/fr/b': res(200, '<html>ok2</html>'),
  });
  const f = createPoliteFetcher({ ...options, fetchImpl });
  assert.equal(await f.fetchText('https://site.test/fr/a'), '<html>ok</html>');
  await f.fetchText('https://site.test/fr/b');
  assert.equal(calls.filter((u) => u.endsWith('/robots.txt')).length, 1);
});

test('refuses a path disallowed by robots.txt WITHOUT requesting it', async () => {
  const { fetchImpl, calls } = fakeSite({ '/robots.txt': res(200, 'User-agent: *\nDisallow: /fr/') });
  const f = createPoliteFetcher({ ...options, fetchImpl });
  await assert.rejects(f.fetchText('https://site.test/fr/a'), /disallows/);
  assert.ok(!calls.some((u) => u.endsWith('/fr/a')));
});

test('a missing robots.txt (404) means allowed; an unreadable one (500) means STOP', async () => {
  const open = fakeSite({ '/p': res(200, 'x') });
  assert.equal(await createPoliteFetcher({ ...options, fetchImpl: open.fetchImpl }).fetchText('https://a.test/p'), 'x');

  const broken = fakeSite({ '/robots.txt': res(500), '/p': res(200, 'x') });
  await assert.rejects(createPoliteFetcher({ ...options, fetchImpl: broken.fetchImpl }).fetchText('https://b.test/p'), /could not be read/);
  assert.ok(!broken.calls.some((u) => u.endsWith('/p')));
});

test('waits at least minDelayMs between two requests to the same host', async () => {
  const { fetchImpl } = fakeSite({ '/robots.txt': res(404), '/a': res(200, '1'), '/b': res(200, '2') });
  const f = createPoliteFetcher({ ...options, minDelayMs: 120, fetchImpl });
  await f.fetchText('https://site.test/a');
  const t0 = Date.now();
  await f.fetchText('https://site.test/b');
  assert.ok(Date.now() - t0 >= 100, `waited ${Date.now() - t0} ms`);
});

test('non-2xx answers become errors', async () => {
  const { fetchImpl } = fakeSite({ '/robots.txt': res(404), '/x': res(503) });
  await assert.rejects(createPoliteFetcher({ ...options, fetchImpl }).fetchText('https://site.test/x'), /HTTP 503/);
});
