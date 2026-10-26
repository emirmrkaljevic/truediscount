import { formatPrice } from '../core/price.js';
import { lowestInWindow } from '../core/history.js';
import { makeT } from '../core/strings.js';
import { reportUrl, summarizeDetection } from '../core/report.js';
import { HIDDEN_KEY, isHidden, addHidden, removeHidden, normalizeHost, isValidHost } from '../core/sites.js';

const api = globalThis.browser ?? globalThis.chrome;
const list = document.getElementById('list');
const t = makeT(api.i18n?.getMessage?.bind(api.i18n));
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);

async function show() {
  const all = await api.storage.local.get(null);
  const items = Object.entries(all).filter(([, v]) => v?.history?.length)
    .sort((a, b) => (!!b[1].watch - !!a[1].watch) || b[1].history.at(-1).t - a[1].history.at(-1).t).slice(0, 30);
  list.replaceChildren(...items.map(([k, v]) => {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.textContent = v.name || k; name.title = k;
    if (v.watch) {
      const hit = v.history.at(-1).p <= v.watch.target;
      name.textContent = (hit ? '✅ ' : '🔔 ') + name.textContent;
      name.title = `${k} · ${t('watchActive', [formatPrice(v.watch.target, v.currency || 'EUR')])}`;
      if (hit) li.className = 'hit';
    }
    const p = document.createElement('span');
    const low = lowestInWindow(v.history, Date.now(), 30, false);
    p.textContent = `${formatPrice(v.history.at(-1).p, v.currency || 'EUR')} (${t('popupLow', [formatPrice(low, v.currency || 'EUR')])})`;
    li.append(name, p); return li;
  }));
  if (!items.length) { const li = document.createElement('li'); li.textContent = t('popupEmpty'); list.append(li); }
}

document.getElementById('clear').onclick = async () => {
  if (!confirm(t('popupConfirmClear'))) return;
  // Clearing history keeps the list of hidden sites.
  const { [HIDDEN_KEY]: hidden } = await api.storage.local.get(HIDDEN_KEY);
  await api.storage.local.clear();
  if (hidden) await api.storage.local.set({ [HIDDEN_KEY]: hidden });
  show();
};

document.getElementById('enable').onclick = async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('https://')) return;
  const origin = new URL(tab.url).origin;
  const granted = await api.permissions.request({ origins: [origin + '/*'] });
  if (!granted) return;
  const res = await api.runtime.sendMessage({ type: 'enable-site', origin });
  await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  document.getElementById('enable').textContent = t(res?.ok ? 'popupEnabled' : 'popupAlready');
};

document.getElementById('report').onclick = async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  let info;
  try { info = await api.tabs.sendMessage(tab.id, { type: 'diagnose' }); } catch { info = undefined; }
  const browser = navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Chrome';
  const url = reportUrl({ pageUrl: tab?.url || '', version: api.runtime.getManifest().version, browser, detection: summarizeDetection(info) });
  await api.tabs.create({ url });
  window.close();
};

show();

// File pickers close the popup in some browsers, so backup and restore live in their own tab.
document.getElementById('backup').onclick = async () => {
  await api.tabs.create({ url: api.runtime.getURL('src/popup/backup.html') });
  window.close();
};

document.getElementById('settings').onclick = () => { api.runtime.openOptionsPage(); window.close(); };

// Per-site toggle for the current tab.
async function showToggle() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!/^https?:/.test(tab?.url || '')) return;
  const host = normalizeHost(new URL(tab.url).hostname);
  if (!isValidHost(host)) return;
  const btn = document.getElementById('toggle-site');
  const load = async () => (await api.storage.local.get(HIDDEN_KEY))[HIDDEN_KEY] || [];
  const paint = list => { btn.textContent = t(isHidden(list, host) ? 'popupShowSite' : 'popupHideSite', [host]); btn.hidden = false; };
  paint(await load());
  btn.onclick = async () => {
    const list = await load();
    const next = isHidden(list, host) ? removeHidden(list, host) : addHidden(list, host);
    await api.storage.local.set({ [HIDDEN_KEY]: next });
    paint(next);
  };
}
showToggle();
