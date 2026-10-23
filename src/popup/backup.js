import { exportData, exportCsv, parseImport, mergeImport } from '../core/backup.js';
import { lowestInWindow } from '../core/history.js';
import { formatPrice } from '../core/price.js';
import { makeT } from '../core/strings.js';

const api = globalThis.browser ?? globalThis.chrome;
const t = makeT(api.i18n?.getMessage?.bind(api.i18n));
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
document.title = t('backupTitle');
const status = document.getElementById('status');
const file = document.getElementById('file');
const tbody = document.getElementById('rows');

function download(blob, name, count) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = t('backupExported', [String(count)]);
}

async function renderTable() {
  const all = await api.storage.local.get(null);
  const items = Object.entries(exportData(all).items)
    .sort((a, b) => (!!b[1].watch - !!a[1].watch) || b[1].history.at(-1).t - a[1].history.at(-1).t);
  tbody.replaceChildren(...items.map(([k, v]) => {
    const tr = document.createElement('tr');
    const cur = v.currency || 'EUR';
    const latest = v.history.at(-1).p;
    const low = lowestInWindow(v.history, Date.now(), 30, false);
    if (v.watch && latest <= v.watch.target) tr.className = 'hit';
    const tdName = document.createElement('td');
    if (/^[a-z0-9.-]+\//i.test(k)) {
      const a = document.createElement('a');
      a.href = `https://${k}`; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = v.name || k;
      tdName.append(a);
    } else tdName.textContent = v.name || k;
    const cell = text => { const td = document.createElement('td'); td.textContent = text; return td; };
    tr.append(tdName, cell(formatPrice(latest, cur)), cell(formatPrice(low, cur)), cell(v.watch ? formatPrice(v.watch.target, cur) : ''));
    return tr;
  }));
}

document.getElementById('export').onclick = async () => {
  const data = exportData(await api.storage.local.get(null));
  download(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), `truediscount-history-${data.exported.slice(0, 10)}.json`, Object.keys(data.items).length);
};

document.getElementById('csv').onclick = async () => {
  const all = await api.storage.local.get(null);
  const data = exportData(all);
  download(new Blob([exportCsv(all)], { type: 'text/csv;charset=utf-8' }), `truediscount-history-${data.exported.slice(0, 10)}.csv`, Object.keys(data.items).length);
};

document.getElementById('import').onclick = () => file.click();
file.onchange = async () => {
  const f = file.files[0]; file.value = '';
  if (!f) return;
  try {
    if (f.size > 20e6) throw new Error('file too large');
    const items = parseImport(await f.text());
    const { updates, added, merged } = mergeImport(await api.storage.local.get(Object.keys(items)), items);
    await api.storage.local.set(updates);
    status.textContent = t('backupImported', [String(added), String(merged)]);
    renderTable();
  } catch (e) {
    status.textContent = t('backupError', [e.message]);
  }
};

renderTable();
