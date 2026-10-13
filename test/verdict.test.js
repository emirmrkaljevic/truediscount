import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addPoint, lowestInWindow, DAY } from '../src/core/history.js';
import { evaluate } from '../src/core/verdict.js';

const now = Date.UTC(2026, 10, 27, 12);
const hist = (pairs) => pairs.reduce((h, [d, p]) => addPoint(h, p, now - d * DAY), []);

test('keeps lowest price per day and drops old points', () => {
  let h = addPoint([], 10, now); h = addPoint(h, 8, now); h = addPoint(h, 5, now - 200 * DAY);
  assert.equal(h.length, 1); assert.equal(h[0].p, 8);
});

test('lowest in 30 day window excludes today and older points', () => {
  const h = hist([[40, 50], [10, 80], [3, 90], [0, 60]]);
  assert.equal(lowestInWindow(h, now), 80);
});

test('flags inflated old price', () => {
  const v = evaluate({ price: 60, oldPrice: 120, history: hist([[7, 59.99], [2, 99]]), now });
  assert.equal(v.status, 'higher');
  const w = evaluate({ price: 60, oldPrice: 120, history: hist([[7, 70]]), now });
  assert.equal(w.status, 'inflated'); assert.equal(w.claimedPct, 50); assert.equal(w.realPct, 14);
});

test('accepts genuine discount and no-data', () => {
  assert.equal(evaluate({ price: 80, oldPrice: 100, history: hist([[5, 100]]), now }).status, 'real');
  assert.equal(evaluate({ price: 80, oldPrice: 100, history: [], now }).status, 'nodata');
});
