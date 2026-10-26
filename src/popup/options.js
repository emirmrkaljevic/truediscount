import { HIDDEN_KEY, addHidden, removeHidden, normalizeHost, isValidHost } from '../core/sites.js';
import { makeT } from '../core/strings.js';

const api = globalThis.browser ?? globalThis.chrome;
const t = makeT(api.i18n?.getMessage?.bind(api.i18n));
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
document.title = t('optionsTitle');
const ul = document.getElementById('sites');
const status = document.getElementById('status');
const input = document.getElementById('host');

const load = async () => (await api.storage.local.get(HIDDEN_KEY))[HIDDEN_KEY] || [];
const save = list => api.storage.local.set({ [HIDDEN_KEY]: list });

async function show() {
  const list = await load();
  ul.replaceChildren(...list.map(d => {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.textContent = d;
    const b = document.createElement('button'); b.textContent = t('optionsRemove');
    b.onclick = async () => { await save(removeHidden(await load(), d)); show(); };
    li.append(name, b); return li;
  }));
  if (!list.length) { const li = document.createElement('li'); li.textContent = t('optionsEmpty'); ul.append(li); }
}

document.getElementById('add').onsubmit = async e => {
  e.preventDefault();
  const h = normalizeHost(input.value);
  if (!isValidHost(h)) { status.textContent = t('optionsInvalid', [input.value]); return; }
  status.textContent = '';
  await save(addHidden(await load(), h));
  input.value = '';
  show();
};

show();
