import { addPoint } from './core/history.js';

const api = globalThis.browser ?? globalThis.chrome;

async function record(key, info) {
  const { [key]: entry } = await api.storage.local.get(key);
  const e = entry || { name: info.name, currency: info.currency, host: info.host, history: [] };
  e.name = info.name || e.name;
  e.history = addPoint(e.history, info.price, Date.now());
  await api.storage.local.set({ [key]: e });
  return e;
}

api.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg?.type === 'record') {
    // Return the history from before today's visit so the comparison is not biased by itself.
    api.storage.local.get(msg.key).then(async prev => {
      const before = prev[msg.key]?.history || [];
      await record(msg.key, msg.info);
      send({ history: before });
    });
    return true;
  }
  if (msg?.type === 'enable-site') {
    const id = 'site-' + msg.origin;
    api.scripting.registerContentScripts([{ id, matches: [msg.origin + '/*'], js: ['content.js'], runAt: 'document_idle' }])
      .then(() => send({ ok: true }), err => send({ ok: false, error: String(err) }));
    return true;
  }
});
