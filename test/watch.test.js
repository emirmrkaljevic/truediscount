import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTarget, setWatch, checkWatch, reachedCount } from '../src/core/watch.js';

test('default target is 10% below, rounded down to cents', () => {
  assert.equal(defaultTarget(199.99), 179.99);
  assert.equal(defaultTarget(10), 9);
});

test('set and remove a watch', () => {
  const e = setWatch({ name: 'X', history: [] }, 49.999, 1);
  assert.deepEqual(e.watch, { target: 50, since: 1, alerted: null });
  assert.equal(setWatch(e, null).watch, undefined);
  assert.throws(() => setWatch(e, -1));
});

test('alerts once per drop, again on a further drop, re-arms above target', () => {
  let e = setWatch({ history: [] }, 100);
  let r = checkWatch(e, 120); assert.equal(r.alert, false); e = r.entry;
  r = checkWatch(e, 99); assert.equal(r.alert, true); e = r.entry;
  r = checkWatch(e, 99); assert.equal(r.alert, false); e = r.entry;
  r = checkWatch(e, 95); assert.equal(r.alert, true); e = r.entry;
  r = checkWatch(e, 130); assert.equal(r.alert, false); assert.equal(r.entry.watch.alerted, null); e = r.entry;
  r = checkWatch(e, 100); assert.equal(r.alert, true);
});

test('unwatched products never alert', () => {
  assert.equal(checkWatch({ history: [] }, 1).alert, false);
});

test('counts watched products at or below target', () => {
  const all = {
    a: { watch: { target: 50 }, history: [{ t: 1, p: 49 }] },
    b: { watch: { target: 50 }, history: [{ t: 1, p: 60 }] },
    c: { history: [{ t: 1, p: 1 }] },
  };
  assert.equal(reachedCount(all), 1);
});
