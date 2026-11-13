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

test('MediaWorld Italy: same MediaMarkt layout, Italian 30gg lowest-price label', () => {
  const r = extract(load('mediaworld-live.html'), 'www.mediaworld.it');
  assert.deepEqual([r.adapter, r.sku, r.price, r.oldPrice, r.shopLow30, r.currency], ['mediamarkt', '424284', 459, null, 469, 'EUR']);
  assert.match(r.name, /iPad/i);
  const v = evaluate({ price: r.price, oldPrice: r.oldPrice, oldKind: r.oldKind, shopLow30: r.shopLow30, history: [] });
  assert.equal(v.status, 'nodiscount');
  assert.equal(v.source, 'shop');
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

test('Lidl: UVP next to the struck price is an RRP, a bare struck price is the previous price', () => {
  const a = extract(load('lidl-uvp-live.html'), 'www.lidl.de');
  assert.deepEqual([a.adapter, a.sku, a.price, a.oldPrice, a.oldKind], ['lidl', '100407642', 349, 599, 'rrp']);
  const b = extract(load('lidl-fr-deal-live.html'), 'www.lidl.fr');
  assert.deepEqual([b.adapter, b.sku, b.price, b.oldPrice, b.oldKind], ['lidl', '100410190', 39.99, 49.99, 'previous']);
  const c = extract(load('lidl-plain-live.html'), 'www.lidl.de');
  assert.deepEqual([c.adapter, c.price, c.oldPrice], ['lidl', 139, null]);
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
  // A 1-3 digit prefix must not win. These used to become 129, 159, 1.59 and 1.
  assert.equal(firstPrice('1299,99'), 1299.99);
  assert.equal(firstPrice('1599.00'), 1599);
  assert.equal(firstPrice('1000'), 1000);
  assert.equal(firstPrice('2149.00 €'), 2149);
  assert.equal(firstPrice('€1,599.00'), 1599);
  assert.equal(firstPrice('1099.–'), 1099);
  assert.equal(firstPrice('1.099,-'), 1099);
  assert.equal(firstPrice("CHF 1'299.00"), 1299);
  assert.equal(firstPrice('1’099.00'), 1099);
  assert.equal(firstPrice('1’299.–'), 1299);
});

test('prices of 1000 or more stay whole, so a fake discount is still compared', () => {
  const { document } = parseHTML(`<html><head><script type="application/ld+json">${JSON.stringify(
    { '@type': 'Product', name: 'Washer', offers: { price: '899.00', priceCurrency: 'EUR' } })}</script></head><body>
    <s>1599,99 €</s><p>Lowest price in the last 30 days: 1299,00 €</p></body></html>`);
  const r = extract(document, 'shop.example');
  assert.deepEqual([r.price, r.oldPrice, r.shopLow30], [899, 1599.99, 1299]);
  const v = evaluate({ price: r.price, oldPrice: r.oldPrice, oldKind: r.oldKind, shopLow30: r.shopLow30, history: [] });
  assert.equal(v.status, 'inflated');
  assert.equal(v.low30, 1299);
  assert.equal(v.source, 'shop');
});

test('comma thousands on an Irish price block are not cut after the first digits', () => {
  const { document } = parseHTML(`<html><body><span id="productTitle">Kettle</span>
    <div id="corePriceDisplay_desktop_feature_div"><span class="priceToPay"><span class="a-offscreen">€1,099.00</span></span>
    <div class="basisPrice"><span class="a-offscreen">€1,599.00</span></div></div></body></html>`);
  const r = extract(document, 'www.amazon.ie');
  assert.deepEqual([r.adapter, r.price, r.oldPrice, r.name], ['amazon', 1099, 1599, 'Kettle']);
});

test('MediaMarkt Switzerland apostrophe prices are not read as 1', () => {
  const { document } = parseHTML(`<html><head><script type="application/ld+json">${JSON.stringify(
    { '@type': 'Product', name: 'Speaker', sku: '1', offers: { price: '899.00', priceCurrency: 'CHF' } })}</script></head><body>
    <span data-test="mms-strike-price-type-rrp">CHF 1’299.00</span></body></html>`);
  const r = extract(document, 'www.mediamarkt.ch');
  assert.equal(r.adapter, 'mediamarkt');
  assert.deepEqual([r.price, r.oldPrice, r.oldKind, r.currency], [899, 1299, 'rrp', 'CHF']);
});

test('Notino: selected size, not the other size, the unit price or the recommended price', () => {
  const sale = extract(load('notino-sale-live.html'), 'www.notino.de');
  assert.deepEqual([sale.adapter, sale.sku, sale.price, sale.oldPrice, sale.shopLow30, sale.currency], ['notino', '62121', 22.5, null, 23.5, 'EUR']);
  assert.match(sale.name, /Jil Sander/);
  const v = evaluate({ price: sale.price, oldPrice: sale.oldPrice, oldKind: sale.oldKind, shopLow30: sale.shopLow30, history: [] });
  assert.equal(v.status, 'nodiscount');
  assert.equal(v.source, 'shop');
  assert.equal(v.low30, 23.5);

  const voucher = extract(load('notino-voucher-live.html'), 'www.notino.de');
  assert.deepEqual([voucher.adapter, voucher.sku, voucher.price, voucher.oldPrice, voucher.shopLow30, voucher.currency], ['notino', '16378997', 34.9, null, 29.9, 'EUR']);
  assert.match(voucher.name, /Cool Water/);
  const w = evaluate({ price: voucher.price, oldPrice: voucher.oldPrice, oldKind: voucher.oldKind, shopLow30: voucher.shopLow30, history: [] });
  assert.equal(w.status, 'higher');
  assert.equal(w.source, 'shop');
});

test('Notino: 30-day label still counts when the page state is missing, and a Czech price stays in CZK', () => {
  const { document: labelOnly } = parseHTML(`<html><body>
    <div data-testid="pd-price-wrapper"><span content="22,50">22,50</span> €</div>
    <div data-testid="product-specifications">Mindestpreis 23,50 €</div>
    </body></html>`);
  const a = extract(labelOnly, 'www.notino.at');
  assert.deepEqual([a.adapter, a.price, a.oldPrice, a.shopLow30], ['notino', 22.5, null, 23.5]);

  const { document: cz } = parseHTML(`<html><body><script id="__APOLLO_STATE__" type="application/json">${JSON.stringify({
    'CatalogVariant:100': { webId: '100', price: { value: 2950, currency: 'CZK' }, recentMinPrice: { value: 2601 }, originalPrice: { value: 3200, type: 'Recommended' } },
  })}</script><h1>Sauvage</h1></body></html>`);
  const b = extract(cz, 'www.notino.cz');
  assert.deepEqual([b.adapter, b.sku, b.price, b.oldPrice, b.shopLow30, b.currency], ['notino', '100', 2950, null, 2601, 'CZK']);
  assert.equal(evaluate({ price: b.price, oldPrice: b.oldPrice, shopLow30: b.shopLow30, history: [] }).status, 'higher');
});

test('Euronics Italy: barred previous price is the 30-day low, recommended price is not', () => {
  const deal = extract(load('euronics-deal-live.html'), 'www.euronics.it');
  assert.deepEqual([deal.adapter, deal.sku, deal.price, deal.oldPrice, deal.oldKind, deal.shopLow30, deal.currency], ['euronics', '262000523', 399, 549.99, 'previous', 549.99, 'EUR']);
  assert.match(deal.name, /Lavatrice Serie 600/);
  const v = evaluate({ price: deal.price, oldPrice: deal.oldPrice, oldKind: deal.oldKind, shopLow30: deal.shopLow30, history: [] });
  assert.equal(v.status, 'real');
  assert.equal(v.source, 'shop');
  assert.equal(v.low30, 549.99);

  const plain = extract(load('euronics-plain-live.html'), 'www.euronics.it');
  assert.deepEqual([plain.adapter, plain.sku, plain.price, plain.oldPrice, plain.oldKind, plain.shopLow30], ['euronics', '242001377', 329.99, 499.99, 'rrp', null]);
  assert.match(plain.name, /CANDY/);
  const w = evaluate({ price: plain.price, oldPrice: plain.oldPrice, oldKind: plain.oldKind, shopLow30: plain.shopLow30, history: [] });
  assert.equal(w.status, 'nodata');
  assert.match(message(w), /RRP/);
});

test('About You: 30-day price is the struck reference, original price is not', () => {
  const sale = extract(load('aboutyou-sale-live.html'), 'www.aboutyou.de');
  assert.deepEqual([sale.adapter, sale.sku, sale.price, sale.oldPrice, sale.oldKind, sale.shopLow30, sale.currency], ['aboutyou', '32423052', 94.9, 119, 'previous', 119, 'EUR']);
  assert.match(sale.name, /WAVE MOTION/);
  const v = evaluate({ price: sale.price, oldPrice: sale.oldPrice, oldKind: sale.oldKind, shopLow30: sale.shopLow30, history: [] });
  assert.equal(v.status, 'real');
  assert.equal(v.source, 'shop');
  assert.equal(v.low30, 119);

  const original = extract(load('aboutyou-original-live.html'), 'www.aboutyou.fr');
  assert.deepEqual([original.adapter, original.sku, original.price, original.oldPrice, original.oldKind, original.shopLow30, original.currency], ['aboutyou', '32443407', 15.9, 19.9, 'rrp', 13.93, 'EUR']);
  assert.match(original.name, /VMPAULINA THEA/);
  const w = evaluate({ price: original.price, oldPrice: original.oldPrice, oldKind: original.oldKind, shopLow30: original.shopLow30, history: [] });
  assert.equal(w.status, 'higher');
  assert.equal(w.source, 'shop');
  assert.match(message(w), /RRP/);

  const { document: fromPrice } = parseHTML(`<html><body>
    <link rel="canonical" href="https://www.aboutyou.at/p/only/strickjacke-onlcarol-27951470">
    <h1>ONLY Strickjacke</h1>
    <div data-testid="priceBox">
      <span data-testid="finalPrice">Ab 23,90€</span>
      <div data-testid="originalPrice">Ursprünglich: 29,90€</div>
      <div data-testid="lowestProductPrice30D"><div data-value="true">23,90€</div></div>
    </div></body></html>`);
  const c = extract(fromPrice, 'www.aboutyou.at');
  assert.deepEqual([c.adapter, c.sku, c.price, c.oldPrice, c.oldKind, c.shopLow30], ['aboutyou', '27951470', 23.9, 29.9, 'rrp', 23.9]);
  const inflated = evaluate({ price: c.price, oldPrice: c.oldPrice, oldKind: c.oldKind, shopLow30: c.shopLow30, history: [] });
  assert.equal(inflated.status, 'inflated');
  assert.equal(inflated.low30, 23.9);
});

test('Morele: 30-day low is separate from the barred price and the price without a code', () => {
  const deal = extract(load('morele-deal-live.html'), 'www.morele.net');
  assert.deepEqual([deal.adapter, deal.sku, deal.price, deal.oldPrice, deal.oldKind, deal.shopLow30, deal.currency], ['morele', '5626721', 89, 95.01, 'previous', 95.01, 'PLN']);
  assert.match(deal.name, /JBL Tune 500/);
  const v = evaluate({ price: deal.price, oldPrice: deal.oldPrice, oldKind: deal.oldKind, shopLow30: deal.shopLow30, history: [] });
  assert.equal(v.status, 'real');
  assert.equal(v.source, 'shop');
  assert.equal(v.low30, 95.01);

  const code = extract(load('morele-code-live.html'), 'www.morele.net');
  assert.deepEqual([code.adapter, code.sku, code.price, code.oldPrice, code.oldKind, code.shopLow30, code.currency], ['morele', '6624711', 319, 420, 'previous', 344.35, 'PLN']);
  assert.match(code.name, /Verbatim Vi560/);
  const w = evaluate({ price: code.price, oldPrice: code.oldPrice, oldKind: code.oldKind, shopLow30: code.shopLow30, history: [] });
  assert.equal(w.status, 'inflated');
  assert.equal(w.source, 'shop');
  assert.equal(w.low30, 344.35);
});

test('Unieuro Italy: previous price is the 30-day low, recommended price is not', () => {
  const deal = extract(load('unieuro-deal-live.html'), 'www.unieuro.it');
  assert.deepEqual([deal.adapter, deal.sku, deal.price, deal.oldPrice, deal.oldKind, deal.shopLow30, deal.currency], ['unieuro', 'APLMFF04TA', 2099, 2199, 'previous', 2199, 'EUR']);
  assert.match(deal.name, /Studio Display/);
  const v = evaluate({ price: deal.price, oldPrice: deal.oldPrice, oldKind: deal.oldKind, shopLow30: deal.shopLow30, history: [] });
  assert.equal(v.status, 'real');
  assert.equal(v.source, 'shop');
  assert.equal(v.low30, 2199);

  const rrp = extract(load('unieuro-rrp-live.html'), 'www.unieuro.it');
  assert.deepEqual([rrp.adapter, rrp.sku, rrp.price, rrp.oldPrice, rrp.oldKind, rrp.shopLow30], ['unieuro', 'SAD3102038', 8.99, 16.99, 'rrp', null]);
  assert.match(rrp.name, /Cruzer Blade/);
  const w2 = evaluate({ price: rrp.price, oldPrice: rrp.oldPrice, oldKind: rrp.oldKind, shopLow30: rrp.shopLow30, history: [] });
  assert.equal(w2.status, 'nodata');
  assert.match(message(w2), /RRP/);
});


test('Komputronik: 30-day low is separate from the price without the promotion', () => {
  const deal = extract(load('komputronik-deal-live.html'), 'www.komputronik.pl');
  assert.deepEqual([deal.adapter, deal.sku, deal.price, deal.oldPrice, deal.oldKind, deal.shopLow30, deal.currency], ['komputronik', '1033005', 1399, 1689, 'previous', 1429, 'PLN']);
  assert.match(deal.name, /70mai A900/);
  const v = evaluate({ price: deal.price, oldPrice: deal.oldPrice, oldKind: deal.oldKind, shopLow30: deal.shopLow30, history: [] });
  assert.equal(v.status, 'inflated');
  assert.equal(v.source, 'shop');
  assert.equal(v.low30, 1429);

  const real = extract(load('komputronik-real-live.html'), 'www.komputronik.pl');
  assert.deepEqual([real.adapter, real.sku, real.price, real.oldPrice, real.oldKind, real.shopLow30, real.currency], ['komputronik', '1023066', 339, 399, 'previous', 399, 'PLN']);
  assert.match(real.name, /Silk-épil 7/);
  const w = evaluate({ price: real.price, oldPrice: real.oldPrice, oldKind: real.oldKind, shopLow30: real.shopLow30, history: [] });
  assert.equal(w.status, 'real');
  assert.equal(w.source, 'shop');
  assert.equal(w.low30, 399);
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
