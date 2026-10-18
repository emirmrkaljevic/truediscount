import { formatPrice } from '../core/price.js';
import { lowestInWindow } from '../core/history.js';
import { makeT } from '../core/strings.js';
import { reportUrl, summarizeDetection } from '../core/report.js';

const api = globalThis.browser ?? globalThis.chrome;
const list = document.getElementById('list');
const t = makeT(api.i18n?.getMessage?.bind(api.i18n));
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);

async function show() {
  const all = await api.storage.local.get(null);
  const items = Object.entries(all).filter(([, v]) => v?.history?.length)
    .sort((a, b) => b[1].history.at(-1).t - a[1].history.at(-1).t).slice(0, 30);
  list.replaceChildren(...items.map(([k, v]) => {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.textContent = v.name || k; name.title = k;
    const p = document.createElement('span');
    const low = lowestInWindow(v.history, Date.now(), 30, false);
    p.textContent = `${formatPrice(v.history.at(-1).p, v.currency || 'EUR')} (${t('popupLow', [formatPrice(low, v.currency || 'EUR')])})`;
    li.append(name, p); return li;
  }));
  if (!items.length) { const li = document.createElement('li'); li.textContent = t('popupEmpty'); list.append(li); }
}

document.getElementById('clear').onclick = async () => {
  if (confirm(t('popupConfirmClear'))) { await api.storage.local.clear(); show(); }
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
