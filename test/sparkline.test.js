import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sparkline } from '../src/core/sparkline.js';

test('sparkline needs two points and produces a path', () => {
  assert.equal(sparkline([{ t: 1, p: 1 }]), '');
  const svg = sparkline([{ t: 0, p: 10 }, { t: 1, p: 5 }]);
  assert.match(svg, /<path d="M2\.0,2\.0 L158\.0,34\.0"/);
});
