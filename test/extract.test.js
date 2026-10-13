import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { extract, productKey } from '../src/core/extract.js';

const load = f => parseHTML(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')).document;

test('generic JSON-LD with @graph and <del> old price', () => {
  const r = extract(load('generic.html'), 'shop.example');
  assert.deepEqual([r.adapter, r.name, r.price, r.oldPrice, r.currency], ['generic', 'Noise Cancelling Headphones', 199, 399, 'EUR']);
});

test('amazon adapter', () => {
  const r = extract(load('amazon.html'), 'www.amazon.de');
  assert.deepEqual([r.adapter, r.name, r.price, r.oldPrice], ['amazon', 'Coffee Grinder X', 49.99, 79.99]);
});

test('open graph price meta', () => {
  const r = extract(load('microdata.html'), 'lamps.example');
  assert.deepEqual([r.price, r.oldPrice, r.name], [24.9, 29.9, 'Desk Lamp']);
});

test('non-product page returns null', () => {
  assert.equal(extract(parseHTML('<html><body>hi</body></html>').document, 'x.example'), null);
});

test('product key strips query and normalises amazon', () => {
  assert.equal(productKey('https://www.amazon.de/Some-Name/dp/B0ABCDEFGH/ref=x?th=1'), 'amazon.de/dp/B0ABCDEFGH');
  assert.equal(productKey('https://shop.example/p/123/?utm=1'), 'shop.example/p/123');
});
