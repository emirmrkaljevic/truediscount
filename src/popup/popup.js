import { formatPrice } from '../core/price.js';
import { watchlistRows, sortRows } from '../core/watchlist.js';
import { makeT } from '../core/strings.js';
import { reportUrl, summarizeDetection } from '../core/report.js';
import { HIDDEN_KEY, isHidden, addHidden, removeHidden, normalizeHost, isValidHost } from '../core/sites.js';

const api = globalThis.browser ?? globalThis.chrome;
const list = document.getElementById('list');
const t = makeT(api.i18n?.getMessage?.bind(api.i18n));
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);

const sortSel = document.getElementById('sort');
const pct = d => Math.round(d * 100);

async function show() {
  const all = await api.storage.local.get(null);
  const mode = all['td-sort'] === 'drop' ? 'drop' : 'recent';
  sortSel.value = mode;
  const items = sortRows(watchlistRows(all), mode).slice(0, 50);
  list.replaceChildren(...items.map(r => {
    const li = document.createElement('li');
    const name = document.createElement(r.url ? 'a' : 'span');
    name.className = 'name'; name.textContent = r.name; name.title = r.key;
    if (r.url) { name.href = r.url; name.onclick = e => { e.preventDefault(); api.tabs.create({ url: r.url }); window.close(); }; }
    if (r.watch) {
      name.textContent = (r.hit ? '✅ ' : '🔔 ') + name.textContent;
      name.title = `${r.key} · ${t('watchActive', [formatPrice(r.watch.target, r.currency)])}`;
      if (r.hit) li.className = 'hit';
    }
    const p = document.createElement('span');
    const newLow = r.atLow && r.drop >= 0.01;
    p.textContent = newLow ? formatPrice(r.price, r.currency) : `${formatPrice(r.price, r.currency)} (${t('popupLow', [formatPrice(r.low30, r.currency)])})`;
    if (r.drop >= 0.01) {
      const d = document.createElement('b'); d.className = 'drop';
      d.textContent = ` -${pct(r.drop)}%`; d.title = t('popupDropHint', [formatPrice(r.high30, r.currency)]);
      p.append(d);
    }
    if (newLow) { const l = document.createElement('b'); l.className = 'low'; l.textContent = ' ' + t('popupAtLow'); p.append(l); }
    li.append(name, p); return li;
  }));
  if (!items.length) { const li = document.createElement('li'); li.textContent = t('popupEmpty'); list.append(li); }
}

sortSel.onchange = async () => { await api.storage.local.set({ 'td-sort': sortSel.value }); show(); };

document.getElementById('clear').onclick = async () => {
  if (!confirm(t('popupConfirmClear'))) return;
  // Clearing history keeps the list of hidden sites.
  const { [HIDDEN_KEY]: hidden } = await api.storage.local.get(HIDDEN_KEY);
  await api.storage.local.clear();
  if (hidden) await api.storage.local.set({ [HIDDEN_KEY]: hidden });
  await api.storage.local.set({ 'td-sort': sortSel.value });
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
