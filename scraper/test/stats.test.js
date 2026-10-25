import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findPricesTnd, median, parseMoney, parsePriceTnd, summarize, trimOutliers } from '../src/stats.js';

test('parsePriceTnd reads the price formats seen on Tunisian listings', () => {
  assert.equal(parsePriceTnd('  138 000 DT'), 138000);
  assert.equal(parsePriceTnd('138\u00a0000 DT'), 138000); // espace insécable
  assert.equal(parsePriceTnd('Prix : 149.000 DT Possibilité'), 149000);
  assert.equal(parsePriceTnd('49 500 DT'), 49500);
  assert.equal(parsePriceTnd('125000 TND'), 125000);
  assert.equal(parsePriceTnd('Prix sur demande'), null);
});

test('findPricesTnd returns every price in order (the badge comes last)', () => {
  const card = 'Audi Q5 … 129 000 DT Négociable … 16 cv … Bon prix 125 000 DT';
  assert.deepEqual(findPricesTnd(card), [129000, 125000]);
});

test('findPricesTnd ignores km and years', () => {
  assert.deepEqual(findPricesTnd('78 000 km 2023 16 cv'), []);
});

test('median handles odd, even and empty lists', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([10.1, 10.2]), 10.15);
  assert.equal(median([]), null);
});

test('trimOutliers removes absurd prices but keeps small samples intact', () => {
  assert.deepEqual(trimOutliers([100, 110, 120, 130, 140, 9000]), [100, 110, 120, 130, 140]);
  assert.deepEqual(trimOutliers([100, 9000, 120]), [100, 9000, 120]); // < 4 valeurs : on ne touche pas
});

test('summarize filters by year, drops implausible prices and reports min/median/max', () => {
  const listings = [
    { price: 280000, year: 2026 },
    { price: 290000, year: 2026 },
    { price: 165000, year: 2023 }, // trop ancienne pour minYear=2024
    { price: 1000, year: 2026 }, // faute de frappe : < 5 000 DT
    { price: 270000, year: 2025 },
    { price: 300000, year: null }, // année inconnue : écartée par le filtre d'année
  ];
  assert.deepEqual(summarize(listings, { minYear: 2024 }), {
    count: 3,
    min: 270000,
    median: 280000,
    max: 290000,
  });
});

test('summarize returns count 0 when nothing matches', () => {
  assert.deepEqual(summarize([{ price: 100000, year: 2010 }], { minYear: 2024 }), { count: 0 });
});

test('parseMoney understands prices written in many countries', () => {
  const cases = {
    '£51.77': 51.77, // Royaume-Uni
    'Â£51.77': 51.77, // le même, mal décodé (mojibake)
    '1 234,50 €': 1234.5, // France
    '1\u202f234,50 €': 1234.5, // espace fine insécable
    '$12,345': 12345, // États-Unis
    '$12,345.67': 12345.67,
    '12.345,67': 12345.67, // Allemagne
    '138 000 DT': 138000, // Tunisie
    '138.000 DT': 138000,
    '49,5': 49.5,
    '5.123': 5123, // 3 chiffres derrière : séparateur de milliers
    '999': 999,
  };
  for (const [text, expected] of Object.entries(cases)) assert.equal(parseMoney(text), expected, text);
  assert.equal(parseMoney('Prix sur demande'), null);
  assert.equal(parseMoney(''), null);
});

test('summarize accepts custom plausibility bounds (books cost far less than cars)', () => {
  const books = [{ price: 51.77 }, { price: 53.74 }, { price: 50.1 }, { price: 0.5 }, { price: 5000 }];
  assert.deepEqual(summarize(books, { bounds: [1, 1000] }), { count: 3, min: 50.1, median: 51.77, max: 53.74 });
  assert.deepEqual(summarize(books), { count: 1, min: 5000, median: 5000, max: 5000 }); // bornes « voitures » par défaut
});
