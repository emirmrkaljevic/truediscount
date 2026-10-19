import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal in-memory stand-in for the extension APIs used by the background script.
const store = {}, notes = [], badge = [];
let listener;
globalThis.chrome = {
  i18n: { getMessage: () => '' },
  runtime: { onMessage: { addListener: f => { listener = f; } }, getURL: p => p },
  storage: {
    local: {
      get: async k => (k == null ? { ...store } : { [k]: store[k] }),
      set: async o => Object.assign(store, structuredClone(o)),
    },
    onChanged: { addListener() {} },
  },
  action: { setBadgeText: async o => badge.push(o.text), setBadgeBackgroundColor: async () => {} },
  notifications: { create: (id, o) => notes.push(o) },
  scripting: {},
};
await import('../src/background.js');
const send = msg => new Promise(r => listener(msg, {}, r));
const info = price => ({ name: 'Blender', currency: 'EUR', host: 'shop.example', price });

test('watching a product and alerting when a visit records a lower price', async () => {
  await send({ type: 'record', key: 'shop.example/p/1', info: info(100) });
  const w = await send({ type: 'watch', key: 'shop.example/p/1', target: 90 });
  assert.deepEqual([w.ok, w.watch.target], [true, 90]);
  await send({ type: 'record', key: 'shop.example/p/1', info: info(95) });
  assert.equal(notes.length, 0);
  const r = await send({ type: 'record', key: 'shop.example/p/1', info: info(85) });
  assert.equal(notes.length, 1);
  assert.match(notes[0].message, /Blender is now €85\.00 \(your target: €90\.00\)/);
  assert.equal(r.watch.alerted, 85);
  assert.equal(badge.at(-1), '1');
  await send({ type: 'record', key: 'shop.example/p/1', info: info(85) });
  assert.equal(notes.length, 1, 'no repeat alert for the same price');
});

test('removing a watch clears the badge', async () => {
  const w = await send({ type: 'watch', key: 'shop.example/p/1', target: null });
  assert.equal(w.watch, null);
  assert.equal(badge.at(-1), '');
});

test('watch on an unknown product fails cleanly', async () => {
  assert.equal((await send({ type: 'watch', key: 'nope', target: 5 })).ok, false);
});
