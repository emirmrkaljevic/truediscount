import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { extract, firstPrice } from '../src/core/extract.js';
import { evaluate, message } from '../src/core/verdict.js';

const load = f => parseHTML(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')).document;

test('MediaMarkt: product nested in BuyAction, RRP strike price', () => {
  const r = extract(load('mediamarkt-live.html'), 'www.mediamarkt.de');
  assert.deepEqual([r.adapter, r.sku, r.price, r.oldPrice, r.oldKind], ['mediamarkt', '107390121', 213.9, 299, 'rrp']);
  assert.match(message(evaluate({ price: r.price, oldPrice: r.oldPrice, oldKind: r.oldKind, history: [] })), /RRP/);
});

test('Zalando: ProductGroup with variants', () => {
  const r = extract(load('zalando-live.html'), 'en.zalando.de');
  assert.deepEqual([r.adapter, r.price, r.currency, r.oldPrice], ['zalando', 83.95, 'EUR', null]);
  assert.match(r.name, /DUNK RETRO/);
});

test('first price token from mixed labels', () => {
  assert.equal(firstPrice('UVP 299,– €299,00€'), 299);
  assert.equal(firstPrice('Statt 1.299,99 €'), 1299.99);
  assert.equal(firstPrice('was €49.90'), 49.9);
});
