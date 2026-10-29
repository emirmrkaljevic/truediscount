import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHOP_MATCHES } from '../src/hosts.js';
import { ADAPTERS } from '../src/core/extract.js';

const hosts = SHOP_MATCHES.map(m => m.replace('https://*.', '').replace('/*', ''));

test('every shop the extension runs on has an adapter', () => {
  for (const h of hosts) assert.ok(ADAPTERS.some(a => a.host.test(h)), `no adapter for ${h}`);
});

test('newly covered EU shop domains are matched', () => {
  for (const h of ['amazon.ie', 'zalando.cz', 'zalando.se', 'allegro.sk', 'saturn.at', 'mediamarkt.pl'])
    assert.ok(hosts.includes(h), h);
});
