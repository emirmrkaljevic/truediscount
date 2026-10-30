import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchlistRows, sortRows, productUrl, filterRows } from '../src/core/watchlist.js';

const DAY = 86400000, now = 100 * DAY;
const h = (...ps) => ps.map(([d, p]) => ({ t: now - d * DAY, p }));

const all = {
  'shop.de/a': { name: 'A', history: h([10, 100], [0, 80]) },
  'shop.de/b': { name: 'B', history: h([5, 50], [1, 50]) },
  'shop.de/c': { name: 'C', history: h([40, 300], [2, 90], [0, 95]), watch: { target: 90 } },
  'td-hidden-sites': ['x.de'],
};

test('rows compute drop from the 30 day high and the 30 day low', () => {
  const rows = watchlistRows(all, now);
  assert.equal(rows.length, 3);
  const a = rows.find(r => r.key === 'shop.de/a');
  assert.equal(a.drop, 0.2); assert.equal(a.low30, 80); assert.ok(a.atLow);
  const c = rows.find(r => r.key === 'shop.de/c');
  assert.equal(c.high30, 95); assert.equal(c.low30, 90); assert.equal(c.atLow, false); assert.equal(c.hit, false);
  assert.equal(a.url, 'https://shop.de/a');
});

test('drop sort puts the biggest real drop first, recent sort puts alerts first', () => {
  const rows = watchlistRows(all, now);
  assert.deepEqual(sortRows(rows, 'drop').map(r => r.name), ['A', 'B', 'C']);
  assert.equal(sortRows(rows, 'recent')[0].name, 'C');
});

test('productUrl only builds https links for host-like keys', () => {
  assert.equal(productUrl('amazon.de/dp/B000000000'), 'https://amazon.de/dp/B000000000');
  assert.equal(productUrl('javascript:alert(1)'), null);
  assert.equal(productUrl('td-hidden-sites'), null);
});

test('filterRows matches name or key, ignoring case and accents', () => {
  const rows = [{ name: 'Café Crème Maschine', key: 'shop.de/a' }, { name: 'Kopfhörer', key: 'amazon.fr/b' }];
  assert.equal(filterRows(rows, '').length, 2);
  assert.deepEqual(filterRows(rows, 'cafe creme').map(r => r.key), ['shop.de/a']);
  assert.deepEqual(filterRows(rows, 'AMAZON').map(r => r.key), ['amazon.fr/b']);
  assert.equal(filterRows(rows, 'cafe amazon').length, 0);
});
