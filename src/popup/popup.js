import { formatPrice } from '../core/price.js';
import { lowestInWindow } from '../core/history.js';

const api = globalThis.browser ?? globalThis.chrome;
const list = document.getElementById('list');

async function show() {
  const all = await api.storage.local.get(null);
  const items = Object.entries(all).filter(([, v]) => v?.history?.length)
    .sort((a, b) => b[1].history.at(-1).t - a[1].history.at(-1).t).slice(0, 30);
  list.replaceChildren(...items.map(([k, v]) => {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.textContent = v.name || k; name.title = k;
    const p = document.createElement('span');
    const low = lowestInWindow(v.history, Date.now(), 30, false);
    p.textContent = `${formatPrice(v.history.at(-1).p, v.currency || 'EUR')} (30d low ${formatPrice(low, v.currency || 'EUR')})`;
    li.append(name, p); return li;
  }));
  if (!items.length) list.innerHTML = '<li>No prices tracked yet.</li>';
}

document.getElementById('clear').onclick = async () => {
  if (confirm('Delete all stored price history?')) { await api.storage.local.clear(); show(); }
};

document.getElementById('enable').onclick = async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('https://')) return;
  const origin = new URL(tab.url).origin;
  const granted = await api.permissions.request({ origins: [origin + '/*'] });
  if (!granted) return;
  const res = await api.runtime.sendMessage({ type: 'enable-site', origin });
  await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content.js'] });
  document.getElementById('enable').textContent = res?.ok ? 'Enabled on this site' : 'Already enabled';
};

show();
