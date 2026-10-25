import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TtlCache } from '../src/cache.js';

test('serves from cache until the TTL expires', async () => {
  let clock = 0;
  let loads = 0;
  const cache = new TtlCache(1000, () => clock);
  const load = async () => ++loads;

  assert.deepEqual(await cache.getOrLoad('k', load), { value: 1, cached: false });
  assert.deepEqual(await cache.getOrLoad('k', load), { value: 1, cached: true });
  clock = 1001;
  assert.deepEqual(await cache.getOrLoad('k', load), { value: 2, cached: false });
});

test('concurrent requests for the same key trigger ONE load', async () => {
  let loads = 0;
  const cache = new TtlCache(1000);
  const slow = async () => {
    loads += 1;
    await new Promise((r) => setTimeout(r, 20));
    return 'v';
  };
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => cache.getOrLoad('k', slow)));
  assert.equal(loads, 1);
  assert.ok(results.every((r) => r.value === 'v'));
});

test('failures are not cached', async () => {
  const cache = new TtlCache(1000);
  await assert.rejects(cache.getOrLoad('k', async () => { throw new Error('boom'); }), /boom/);
  assert.deepEqual(await cache.getOrLoad('k', async () => 'ok'), { value: 'ok', cached: false });
});
