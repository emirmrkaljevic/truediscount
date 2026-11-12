import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHOP_MATCHES } from '../src/hosts.js';
import { ADAPTERS } from '../src/core/extract.js';

const hosts = SHOP_MATCHES.map(m => m.replace('https://*.', '').replace('/*', ''));

test('every shop the extension runs on has an adapter', () => {
  for (const h of hosts) assert.ok(ADAPTERS.some(a => a.host.test(h)), `no adapter for ${h}`);
});

test('newly covered EU shop domains are matched', () => {
  for (const h of ['amazon.ie', 'zalando.cz', 'zalando.se', 'allegro.sk', 'saturn.at', 'mediamarkt.pl', 'zalando.ro', 'zalando.hr', 'zalando.ee', 'mediaworld.it', 'mediamarkt.ch', 'notino.de', 'notino.fr', 'notino.cz', 'notino.pl', 'euronics.it', 'aboutyou.de', 'aboutyou.fr', 'aboutyou.pl', 'aboutyou.com.cy', 'morele.net', 'unieuro.it'])
    assert.ok(hosts.includes(h), h);
});

test('About You covers EU country sites, including Cyprus, and not the worldwide shop', () => {
  const about = ADAPTERS.find(a => a.id === 'aboutyou');
  assert.equal(about.host.test('www.aboutyou.de'), true);
  assert.equal(about.host.test('en.aboutyou.de'), true);
  assert.equal(about.host.test('www.aboutyou.com.cy'), true);
  assert.equal(about.host.test('www.aboutyou.com'), false);
  assert.equal(about.host.test('www.aboutyou.ch'), false);
});
