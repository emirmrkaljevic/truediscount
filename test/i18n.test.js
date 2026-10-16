import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { EN, makeT } from '../src/core/strings.js';

const locales = readdirSync(new URL('../_locales/', import.meta.url));
const load = l => JSON.parse(readFileSync(new URL(`../_locales/${l}/messages.json`, import.meta.url), 'utf8'));

test('every locale has the same keys and placeholders as English', () => {
  const en = load('en');
  assert.deepEqual(Object.keys(en).sort(), Object.keys(EN).sort());
  for (const l of locales) {
    const m = load(l);
    assert.deepEqual(Object.keys(m).sort(), Object.keys(en).sort(), l);
    for (const k of Object.keys(en)) assert.deepEqual(Object.keys(m[k].placeholders || {}), Object.keys(en[k].placeholders || {}), `${l}.${k}`);
  }
});

test('fallback translator substitutes values', () => {
  assert.equal(makeT()('msgInflated', [50, '€199.00', 0]), 'Shop claims -50%, but we saw €199.00 in the last 30 days. Real saving: 0%.');
  assert.equal(makeT(() => 'Echter Rabatt')('labelReal'), 'Echter Rabatt');
});
