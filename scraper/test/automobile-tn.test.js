import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseListings, searchUrl } from '../src/sources/automobile-tn.js';

// Fixture reconstituée à partir de la page observée (titre, <li> de specs, description, prix, lien de fiche).
const card = ({ id, title, specs, description, price }) => `
  <div class="annonce">
    <img src="https://catalogue.example/${id}.jpeg" alt="${title}">
    <h2>${title}</h2>
    <ul>${specs.map((s) => `<li>${s}</li>`).join('')}</ul>
    <p>${description}</p>
    <span>Ben Arous</span>
    <a href="/fr/occasion/audi/q5/${id}/financement-zitouna">financer avec Banque Zitouna</a>
    <span class="cote">Bon prix</span>
    <span class="price">  ${price}</span>
    <a href="https://www.automobile.tn/fr/occasion/s=brand!:audi@model!:q5/1/audi/q5/${id}"></a>
  </div>`;

const PAGE_A = `<html><body><nav><a href="/fr/occasion">Occasions</a> Prix du neuf</nav>
  <section>
  ${card({ id: 130816, title: 'Audi Q5', specs: ['78 000 km', '2023', 'Automatique', 'Intégrale', '16 cv', 'Hybride'], description: 'Véhicule en excellent état. Whatsapp: +491792671575', price: '138 000 DT' })}
  ${card({ id: 131317, title: 'Audi Q5 Prestige Plus', specs: ['152 000 km', '2021', 'Automatique', '16 cv'], description: '2021 Audi Q5 Toit Pano 129 000 DT Négociable Contactez : 25551771 / 98759655', price: '125 000 DT' })}
  ${card({ id: 124946, title: 'Audi Q5 Ambition Luxe', specs: ['144 000 km', '2009', '13 cv'], description: 'Sline BVA', price: '49 500 DT' })}
  </section>
  <footer><a href="/fr/occasion/s=brand!:audi@model!:q5/2">2</a></footer></body></html>`;

test('extracts one listing per card, with the right fields', () => {
  const listings = parseListings(PAGE_A);
  assert.equal(listings.length, 3);
  assert.deepEqual(listings[0], {
    id: '130816',
    title: 'Audi Q5',
    price: 138000,
    year: 2023,
    km: 78000,
    fiscalPower: 16,
    url: 'https://www.automobile.tn/fr/occasion/s=brand!:audi@model!:q5/1/audi/q5/130816',
  });
});

test('uses the LAST price of the card (the badge), not the one quoted in the description', () => {
  const second = parseListings(PAGE_A).find((l) => l.id === '131317');
  assert.equal(second.price, 125000);
});

test('never leaks phone numbers or description text', () => {
  const dump = JSON.stringify(parseListings(PAGE_A));
  for (const secret of ['98759655', '25551771', '491792671575', 'Whatsapp', 'Contactez', 'Ben Arous']) {
    assert.ok(!dump.includes(secret), `leaked: ${secret}`);
  }
});

test('ignores financing links, pagination and navigation', () => {
  assert.equal(parseListings(PAGE_A).length, 3);
});

test('survives a different page structure (link wraps the whole card, cards in <li>)', () => {
  const html = `<ul>
    <li><a href="/fr/occasion/audi/q5/777001">
      <h3>Audi Q5 S-line</h3><ul><li>81 000 km</li><li>2023</li><li>16 cv</li></ul>
      <div>165 000 DT</div></a></li>
    <li><a href="/fr/occasion/audi/q5/777002">
      <h3>Audi Q5</h3><ul><li>2 486 km</li><li>2026</li><li>15 cv</li></ul>
      <div>280 000 DT</div></a></li>
  </ul>`;
  const listings = parseListings(html);
  assert.deepEqual(listings.map((l) => [l.id, l.price, l.year, l.km]), [
    ['777001', 165000, 2023, 81000],
    ['777002', 280000, 2026, 2486],
  ]);
});

test('skips cards without a price and returns [] on an empty page', () => {
  const html = '<div><h2>X</h2><a href="/fr/occasion/audi/q5/999">…</a></div>';
  assert.deepEqual(parseListings(html), []);
  assert.deepEqual(parseListings('<html></html>'), []);
});

test('builds the search URL seen on the site, with a verified slug for Audi Q5', () => {
  assert.equal(
    searchUrl({ brand: 'Audi', model: 'Q5' }),
    'https://www.automobile.tn/fr/occasion/s=brand!:audi@model!:q5/1',
  );
  assert.equal(
    searchUrl({ brand: 'Audi', model: 'Q3 CROSSBACK' }, 2),
    'https://www.automobile.tn/fr/occasion/s=brand!:audi@model!:q3/2',
  );
});
