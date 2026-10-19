import { addPoint } from './core/history.js';
import { checkWatch, reachedCount, setWatch } from './core/watch.js';
import { formatPrice } from './core/price.js';
import { makeT } from './core/strings.js';

const api = globalThis.browser ?? globalThis.chrome;
const t = makeT(api.i18n?.getMessage?.bind(api.i18n));

async function updateBadge() {
  const n = reachedCount(await api.storage.local.get(null));
  await api.action.setBadgeText({ text: n ? String(n) : '' });
  await api.action.setBadgeBackgroundColor?.({ color: '#15803d' });
}

async function record(key, info) {
  const { [key]: entry } = await api.storage.local.get(key);
  let e = entry || { name: info.name, currency: info.currency, host: info.host, history: [] };
  e.name = info.name || e.name;
  e.history = addPoint(e.history, info.price, Date.now());
  const { entry: checked, alert } = checkWatch(e, info.price);
  e = checked;
  await api.storage.local.set({ [key]: e });
  if (alert) {
    api.notifications?.create(`td-${key}`, {
      type: 'basic', iconUrl: api.runtime.getURL('icons/icon128.png'),
      title: t('alertTitle'),
      message: t('alertBody', [e.name || key, formatPrice(info.price, e.currency || 'EUR'), formatPrice(e.watch.target, e.currency || 'EUR')]),
    });
  }
  if (e.watch) updateBadge();
  return e;
}

api.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg?.type === 'record') {
    // Return the history from before today's visit so the comparison is not biased by itself.
    api.storage.local.get(msg.key).then(async prev => {
      const before = prev[msg.key]?.history || [];
      const e = await record(msg.key, msg.info);
      send({ history: before, watch: e.watch || null });
    });
    return true;
  }
  if (msg?.type === 'watch') {
    api.storage.local.get(msg.key).then(async ({ [msg.key]: entry }) => {
      if (!entry) return send({ ok: false });
      const e = setWatch(entry, msg.target);
      await api.storage.local.set({ [msg.key]: e });
      await updateBadge();
      send({ ok: true, watch: e.watch || null });
    }, err => send({ ok: false, error: String(err) }));
    return true;
  }
  if (msg?.type === 'enable-site') {
    const id = 'site-' + msg.origin;
    api.scripting.registerContentScripts([{ id, matches: [msg.origin + '/*'], js: ['content.js'], runAt: 'document_idle' }])
      .then(() => send({ ok: true }), err => send({ ok: false, error: String(err) }));
    return true;
  }
});

api.storage.onChanged?.addListener(() => updateBadge());
