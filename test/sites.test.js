import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHost, isValidHost, isHidden, addHidden, removeHidden } from '../src/core/sites.js';
import { exportData } from '../src/core/backup.js';
import { reachedCount } from '../src/core/watch.js';
import { manifest, bundleContent } from '../scripts/build.mjs';

test('normalizes hosts and URLs', () => {
  assert.equal(normalizeHost('https://www.Otto.de/p/123'), 'otto.de');
  assert.equal(normalizeHost(' m.zalando.de:443 '), 'm.zalando.de');
  assert.ok(isValidHost('coolblue.nl'));
  assert.ok(!isValidHost('localhost'));
  assert.ok(!isValidHost('not a host'));
});

test('hidden domain covers subdomains but not lookalikes', () => {
  const l = addHidden([], 'www.otto.de');
  assert.deepEqual(l, ['otto.de']);
  assert.ok(isHidden(l, 'otto.de'));
  assert.ok(isHidden(l, 'm.otto.de'));
  assert.ok(!isHidden(l, 'notto.de'));
  assert.ok(!isHidden(undefined, 'otto.de'));
});

test('add is idempotent and sorted, remove works', () => {
  let l = addHidden(['zalando.de'], 'lidl.de');
  l = addHidden(l, 'lidl.de');
  l = addHidden(l, 'bad host');
  assert.deepEqual(l, ['lidl.de', 'zalando.de']);
  assert.deepEqual(removeHidden(l, 'www.lidl.de'), ['zalando.de']);
});

test('hidden list is not treated as a product', () => {
  const all = { _hiddenSites: ['otto.de'], 'a.de/p': { history: [{ t: 1, p: 5 }], watch: { target: 9 } } };
  assert.deepEqual(Object.keys(exportData(all).items), ['a.de/p']);
  assert.equal(reachedCount(all), 1);
});

test('options page and site check are built in', () => {
  assert.equal(manifest('chrome').options_ui.page, 'src/popup/options.html');
  assert.match(bundleContent(), /function isHidden/);
});
