import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { extract } from '../src/core/extract.js';

const doc = html => parseHTML(`<html><head></head><body>${html}</body></html>`).document;
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

test('schema.org StrikethroughPrice in JSON-LD', () => {
  const r = extract(doc(ld({ '@type': 'Product', name: 'Kettle', offers: { '@type': 'Offer', price: 39.99, priceCurrency: 'EUR',
    priceSpecification: [{ '@type': 'UnitPriceSpecification', priceType: 'https://schema.org/StrikethroughPrice', price: 59.99 }] } })), 'shop.example');
  assert.deepEqual([r.price, r.oldPrice, r.oldKind], [39.99, 59.99, 'previous']);
});

test('MSRP price type is treated as RRP', () => {
  const r = extract(doc(ld({ '@type': 'Product', offers: { price: '10', priceSpecification: { priceType: 'MSRP', price: '15' } } })), 'x.example');
  assert.deepEqual([r.oldPrice, r.oldKind], [15, 'rrp']);
});

test('labelled reference prices in several languages', () => {
  const cases = [
    ['<span>statt 49,99 €</span>', 49.99, 'previous'],
    ['<span>UVP: 299,00 €</span>', 299, 'rrp'],
    ['<small>Van €79,99</small>', 79.99, 'previous'],
    ['<p>Przed obniżką: 129,00 zł</p>', 129, 'previous'],
    ['<span>PRP: 49,99 Lei</span>', 49.99, 'rrp'],
  ];
  for (const [html, old, kind] of cases) {
    const r = extract(doc(ld({ '@type': 'Product', offers: { price: '29.99' } }) + html), 'shop.example');
    assert.deepEqual([r.oldPrice, r.oldKind], [old, kind], html);
  }
});

test('price from markup when there is no structured data', () => {
  const r = extract(doc('<div class="product-price__current-price">24,95 €</div><span style="text-decoration: line-through">34,95 €</span>'), 'shop.example');
  assert.deepEqual([r.price, r.oldPrice], [24.95, 34.95]);
});

test('ignores unrelated higher numbers', () => {
  const r = extract(doc(ld({ '@type': 'Product', offers: { price: '20' } }) + '<p>Over 5000 reviews and free delivery from 29 €</p>'), 'shop.example');
  assert.equal(r.oldPrice, null);
});
