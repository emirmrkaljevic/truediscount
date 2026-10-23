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

test('Coolblue: real product pages, current price from JSON-LD and no invented old price', () => {
  const a = extract(load('coolblue-charger-live.html'), 'www.coolblue.nl');
  assert.deepEqual([a.adapter, a.sku, a.price, a.currency, a.oldPrice], ['coolblue', '942614', 70, 'EUR', null]);
  assert.match(a.name, /Sitecom 65W/);
  const b = extract(load('coolblue-tablet-live.html'), 'www.coolblue.nl');
  assert.equal(b.adapter, 'coolblue');
  assert.ok(b.price > 0 && b.oldPrice === null);
  assert.match(b.name, /Galaxy Tab A11/);
});

test('"Retail price" label counts as an RRP', () => {
  const { document } = parseHTML('<html><head><script type="application/ld+json">{"@type":"Product","name":"X","sku":"1","offers":{"@type":"Offer","price":149,"priceCurrency":"EUR"}}</script></head><body><span class="sales-price__former">Retail price 199,-</span></body></html>');
  const r = extract(document, 'www.coolblue.be');
  assert.deepEqual([r.price, r.oldPrice, r.oldKind], [149, 199, 'rrp']);
});

test('first price token from mixed labels', () => {
  assert.equal(firstPrice('UVP 299,– €299,00€'), 299);
  assert.equal(firstPrice('Statt 1.299,99 €'), 1299.99);
  assert.equal(firstPrice('was €49.90'), 49.9);
});

test("Alternate: live product pages with UVP popover and 30-day Bestpreis popover", () => {
  const uvp = extract(load("alternate-uvp-live.html"), "www.alternate.de");
  assert.deepEqual([uvp.adapter, uvp.sku, uvp.price, uvp.oldPrice, uvp.oldKind, uvp.shopLow30], ["alternate", "100074063", 209.9, 269.9, "rrp", null]);
  assert.match(message(evaluate({ price: uvp.price, oldPrice: uvp.oldPrice, oldKind: uvp.oldKind, history: [] })), /RRP/);

  const deal = extract(load("alternate-deal-live.html"), "www.alternate.de");
  assert.deepEqual([deal.adapter, deal.sku, deal.price, deal.oldPrice, deal.oldKind, deal.shopLow30], ["alternate", "100075932", 309.99, 359.99, "previous", 359.99]);
  const v = evaluate({ price: deal.price, oldPrice: deal.oldPrice, oldKind: deal.oldKind, shopLow30: deal.shopLow30, history: [] });
  assert.equal(v.status, "real");
  assert.equal(v.source, "shop");
});
