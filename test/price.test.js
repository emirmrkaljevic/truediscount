import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice } from '../src/core/price.js';

test('parses common EU and EN formats', () => {
  assert.equal(parsePrice('1.299,99 €'), 1299.99);
  assert.equal(parsePrice('€1,299.99'), 1299.99);
  assert.equal(parsePrice('49,90'), 49.9);
  assert.equal(parsePrice('12.50'), 12.5);
  assert.equal(parsePrice('1.299 €'), 1299);
  assert.equal(parsePrice('1 299,00 zł'), 1299);
  assert.equal(parsePrice('19,-'), 19);
  assert.equal(parsePrice(24.5), 24.5);
});

test('rejects garbage', () => {
  assert.equal(parsePrice('free'), null);
  assert.equal(parsePrice(null), null);
});
