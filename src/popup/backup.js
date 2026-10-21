import { exportData, parseImport, mergeImport } from '../core/backup.js';
import { makeT } from '../core/strings.js';

const api = globalThis.browser ?? globalThis.chrome;
const t = makeT(api.i18n?.getMessage?.bind(api.i18n));
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
document.title = t('backupTitle');
const status = document.getElementById('status');
const file = document.getElementById('file');

document.getElementById('export').onclick = async () => {
  const data = exportData(await api.storage.local.get(null));
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = `truediscount-history-${data.exported.slice(0, 10)}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = t('backupExported', [String(Object.keys(data.items).length)]);
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
  } catch (e) {
    status.textContent = t('backupError', [e.message]);
  }
};
