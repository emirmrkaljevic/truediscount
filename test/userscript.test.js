import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';
import { bundleUserscript, header } from '../scripts/build-userscript.mjs';

const code = bundleUserscript();
const cases = [
  ['alternate-deal-live.html', 'www.alternate.de', 'https://www.alternate.de/p/1'],
  ['coolblue-tablet-live.html', 'www.coolblue.nl', 'https://www.coolblue.nl/product/1'],
  ['lidl-fr-deal-live.html', 'www.lidl.fr', 'https://www.lidl.fr/p/1'],
  ['mediamarkt-live.html', 'www.mediamarkt.de', 'https://www.mediamarkt.de/de/product/1.html'],
  ['zalando-live.html', 'www.zalando.de', 'https://www.zalando.de/x.html'],
];

async function runOn(file, hostname, href, gm = new Map()) {
  const { window, document } = parseHTML(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
  const proto = Object.getPrototypeOf(document.createElement('div'));
  if (!proto.attachShadow) proto.attachShadow = function () { const r = document.createElement('div'); this.appendChild(r); return r; };
  const ctx = {
    document, window, navigator: { language: 'de-DE' }, location: { hostname, href },
    GM_getValue: (k, d) => gm.has(k) ? gm.get(k) : d, GM_setValue: (k, v) => gm.set(k, v), GM_notification() {},
    MutationObserver: class { observe() {} }, DOMParser: class { parseFromString(str, type) { return type === 'text/html' ? parseHTML(`<html><body>${str}</body></html>`).document : new window.DOMParser().parseFromString(str, type); } }, setTimeout, clearTimeout, console, URL, Intl, Date, Math, JSON,
  };
  ctx.globalThis = ctx;
  vm.runInNewContext(code, ctx);
  await new Promise(r => setTimeout(r, 50));
  return { document, gm };
}

test('userscript header has metadata and grants', () => {
  const h = header();
  assert.match(h, /@version\s+\d+\.\d+\.\d+/);
  assert.match(h, /@grant\s+GM_setValue/);
  assert.match(h, /@match\s+\S+alternate\.de/);
});

for (const [file, host, href] of cases) {
  test(`userscript shows badge and stores history on ${file}`, async () => {
    const { document, gm } = await runOn(file, host, href);
    assert.ok(document.getElementById('truediscount-host'), 'badge injected');
    const stored = [...gm.values()].map(v => JSON.parse(v)).find(e => e?.history);
    assert.ok(stored?.history?.length >= 1, 'price point saved in GM storage');
  });
}

test('second visit reuses GM history', async () => {
  const [file, host, href] = cases[0];
  const { gm } = await runOn(file, host, href);
  await runOn(file, host, href, gm);
  const e = [...gm.values()].map(v => JSON.parse(v)).find(x => x?.history);
  assert.ok(e.history.length >= 1);
});
