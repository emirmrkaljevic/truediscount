import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportData, parseImport, mergeHistory, mergeImport, FORMAT } from '../src/core/backup.js';
import { DAY } from '../src/core/history.js';

const NOW = 200 * DAY + 5000;
const d = n => NOW - (NOW % DAY) - n * DAY;

test('export keeps only products with history', () => {
  const out = exportData({ a: { name: 'A', history: [{ t: d(1), p: 10 }] }, b: { history: [] }, other: 1 }, NOW);
  assert.equal(out.format, FORMAT);
  assert.deepEqual(Object.keys(out.items), ['a']);
});

test('round trip through JSON', () => {
  const all = { a: { name: 'A', currency: 'EUR', host: 'x.de', history: [{ t: d(2), p: 10 }], watch: { target: 9, since: 1, alerted: 9 } } };
  const items = parseImport(JSON.stringify(exportData(all, NOW)), NOW);
  assert.deepEqual(items.a.history, all.a.history);
  assert.deepEqual(items.a.watch, { target: 9, since: 1, alerted: null });
});

test('rejects files that are not exports', () => {
  assert.throws(() => parseImport('nope'), /JSON/);
  assert.throws(() => parseImport('{"items":{}}'), /truediscount/);
  assert.throws(() => parseImport(JSON.stringify({ format: FORMAT, version: 99, items: {} })), /version/);
  assert.throws(() => parseImport(JSON.stringify({ format: FORMAT, version: 1, items: [] })), /items/);
});

test('drops bad points, old points and reserved keys', () => {
  const items = parseImport(JSON.stringify({ format: FORMAT, version: 1, items: {
    a: { history: [{ t: d(1), p: 5 }, { t: d(100), p: 4 }, { t: 'x', p: 1 }, { t: d(3), p: -2 }, null] },
    b: { history: [{ t: d(100), p: 4 }] },
    'site-https://x': { history: [{ t: d(1), p: 1 }] },
    c: 'junk',
  } }), NOW);
  assert.deepEqual(Object.keys(items), ['a']);
  assert.deepEqual(items.a.history, [{ t: d(1), p: 5 }]);
});

test('merge keeps one point per day, lowest wins, 90-day cap', () => {
  const h = mergeHistory([{ t: d(1), p: 10 }, { t: d(95), p: 1 }], [{ t: d(1) + 3600, p: 8 }, { t: d(2), p: 12 }], NOW);
  assert.deepEqual(h, [{ t: d(2), p: 12 }, { t: d(1), p: 8 }]);
});

test('merge import adds new products and keeps local watch and name', () => {
  const existing = { a: { name: 'Local', history: [{ t: d(1), p: 10 }], watch: { target: 5 } } };
  const imported = { a: { name: 'Old', history: [{ t: d(3), p: 11 }], watch: { target: 7 } }, b: { history: [{ t: d(1), p: 2 }] } };
  const r = mergeImport(existing, imported, NOW);
  assert.equal(r.added, 1); assert.equal(r.merged, 1);
  assert.equal(r.updates.a.name, 'Local');
  assert.equal(r.updates.a.watch.target, 5);
  assert.equal(r.updates.a.history.length, 2);
});
