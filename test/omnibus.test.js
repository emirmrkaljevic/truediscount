import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { extract } from '../src/core/extract.js';
import { evaluate, message } from '../src/core/verdict.js';

const page = (body, price = '79.99') => parseHTML(`<html><head><script type="application/ld+json">${JSON.stringify(
  { '@type': 'Product', name: 'Blender', offers: { price, priceCurrency: 'EUR' } })}</script></head><body>${body}</body></html>`).document;

test('reads 30-day lowest price disclosures in many languages', () => {
  const cases = [
    ['<p>Niedrigster Preis der letzten 30 Tage: 89,99 €</p>', 89.99],
    ['<div><span>Tiefstpreis (30 Tage):</span> <span>84,99 €</span></div>', 84.99],
    ['<small>Prix le plus bas des 30 derniers jours : 92,00 €</small>', 92],
    ['<p>Prezzo più basso degli ultimi 30 giorni: 88,50 €</p>', 88.5],
    ['<p>Precio más bajo de los últimos 30 días: 85,00 €</p>', 85],
    ['<p>Laagste prijs van de afgelopen 30 dagen: € 86,95</p>', 86.95],
    ['<p>Najniższa cena z 30 dni przed obniżką: 349,00 zł</p>', 349],
    ['<p>Cel mai mic preț din ultimele 30 de zile: 399,99 Lei</p>', 399.99],
    ['<p>Lowest price in the last 30 days: €95.00</p>', 95],
    ['<p>Najniža cijena u posljednjih 30 dana: 90,00 €</p>', 90],
  ];
  for (const [html, low] of cases) assert.equal(extract(page(html, html.includes('zł') || html.includes('Lei') ? '299' : '79.99'), 'shop.example').shopLow30, low, html);
});

test('label split across sibling elements and nested markup', () => {
  const r = extract(page('<div class="omnibus"><span>Günstigster Preis der letzten 30 Tage</span><strong>99,99 €</strong></div>'), 'shop.example');
  assert.equal(r.shopLow30, 99.99);
});

test('no disclosure, or a "30" that is not a price, gives null', () => {
  assert.equal(extract(page('<p>30 Tage Rückgaberecht</p><p>Lowest price guarantee for 30 days</p>'), 'shop.example').shopLow30, null);
});

test('first visit verdict uses the shop disclosure', () => {
  const r = extract(page('<del>159,99 €</del><p>Niedrigster Preis der letzten 30 Tage: 79,99 €</p>'), 'shop.example');
  const v = evaluate({ ...r, history: [] });
  assert.equal(v.status, 'inflated');
  assert.equal(v.source, 'shop');
  assert.match(message(v), /its own lowest price in the last 30 days was 79\.99/);
  assert.match(message(evaluate({ price: 79.99, oldPrice: 99.99, shopLow30: 99.99, history: [] })), /discloses/);
});

test('genuine discount vs disclosed prior price', () => {
  const v = evaluate({ price: 79.99, oldPrice: 99.99, shopLow30: 99.99, history: [] });
  assert.equal(v.status, 'real');
});

test('own history wins when it is lower than the disclosure', () => {
  const day = 86400000, now = Date.UTC(2026, 10, 20);
  const v = evaluate({ price: 80, oldPrice: 100, shopLow30: 100, history: [{ t: now - 3 * day, p: 85 }], now });
  assert.deepEqual([v.status, v.source, v.low30], ['inflated', 'seen', 85]);
});
