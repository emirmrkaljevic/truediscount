// Builds dist/truediscount.user.js: the content script plus a small shim that
// replaces the extension APIs with userscript manager storage (GM_getValue / GM_setValue).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { SHOP_MATCHES } from '../src/hosts.js';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const de = JSON.parse(readFileSync('_locales/de/messages.json', 'utf8'));
const RAW = 'https://github.com/emirmrkaljevic/truediscount/releases/latest/download/truediscount.user.js';

export function header() {
  const lines = [
    ['name', 'truediscount: is this discount real?'],
    ['name:de', 'truediscount: Ist der Rabatt echt?'],
    ['namespace', 'https://emirmrkaljevic.github.io/truediscount/'],
    ['version', pkg.version],
    ['description', 'Checks EU shop discounts against the lowest price of the last 30 days (Omnibus rule). Price history stays in your userscript manager, nothing is sent anywhere.'],
    ['description:de', 'Prüft Rabatte in EU-Shops gegen den niedrigsten Preis der letzten 30 Tage (Omnibus-Regel). Preisverlauf bleibt lokal, nichts wird gesendet.'],
    ['author', 'emirmrkaljevic'],
    ['license', 'MIT'],
    ['homepageURL', 'https://emirmrkaljevic.github.io/truediscount/'],
    ['supportURL', 'https://github.com/emirmrkaljevic/truediscount/issues'],
    ['downloadURL', RAW],
    ['updateURL', RAW],
    ...SHOP_MATCHES.map(m => ['match', m]),
    ['grant', 'GM_getValue'], ['grant', 'GM_setValue'], ['grant', 'GM_notification'],
    ['run-at', 'document-idle'],
    ['noframes', ''],
  ];
  return '// ==UserScript==\n' + lines.map(([k, v]) => `// @${k.padEnd(16)} ${v}`.trimEnd()).join('\n') + '\n// ==/UserScript==\n';
}

const SHIM = `
const DE = ${JSON.stringify(Object.fromEntries(Object.entries(de).map(([k, v]) => [k, v.message])))};
const useDe = /^de\\b/i.test(navigator.language || '');
const gmGet = k => { try { return JSON.parse(GM_getValue(k, 'null')); } catch { return null; } };
const gmSet = (k, v) => GM_setValue(k, JSON.stringify(v));
const store = {
  async get(k) { const keys = Array.isArray(k) ? k : [k]; const o = {}; for (const x of keys) { const v = gmGet(x); if (v != null) o[x] = v; } return o; },
  async set(o) { for (const [k, v] of Object.entries(o)) gmSet(k, v); },
};
async function handle(msg) {
  if (msg.type === 'record') {
    const { [msg.key]: prev } = await store.get(msg.key);
    const before = prev?.history || [];
    let e = prev || { name: msg.info.name, currency: msg.info.currency, host: msg.info.host, history: [] };
    e.name = msg.info.name || e.name;
    e.history = addPoint(e.history, msg.info.price, Date.now());
    const { entry, alert } = checkWatch(e, msg.info.price);
    await store.set({ [msg.key]: entry });
    if (alert && typeof GM_notification === 'function') {
      const cur = entry.currency || 'EUR';
      GM_notification({ title: t('alertTitle'), text: t('alertBody', [entry.name || msg.key, formatPrice(msg.info.price, cur), formatPrice(entry.watch.target, cur)]) });
    }
    return { history: before, watch: entry.watch || null };
  }
  if (msg.type === 'watch') {
    const { [msg.key]: entry } = await store.get(msg.key);
    if (!entry) return { ok: false };
    const e = setWatch(entry, msg.target);
    await store.set({ [msg.key]: e });
    return { ok: true, watch: e.watch || null };
  }
  return null;
}
globalThis.__tdApi = {
  i18n: { getMessage: (key, subs = []) => useDe && DE[key] ? DE[key].replace(/\\$(\\d)/g, (_, i) => subs[i - 1] ?? '') : '' },
  storage: { local: store },
  runtime: { sendMessage: handle, onMessage: { addListener() {} } },
};
`;

export function bundleUserscript() {
  const order = ['price', 'history', 'strings', 'watch', 'verdict', 'sparkline', 'extract', 'sites'].map(n => `src/core/${n}.js`);
  const strip = s => s.replace(/^import .*$/gm, '').replace(/^export /gm, '');
  const core = order.map(f => `// ${f}\n` + strip(readFileSync(f, 'utf8'))).join('\n');
  const main = strip(readFileSync('src/content-main.js', 'utf8'))
    .replace('const api = globalThis.browser ?? globalThis.chrome;', 'const api = globalThis.__tdApi;');
  if (!main.includes('globalThis.__tdApi')) throw new Error('content-main.js api line changed');
  // t is needed by the shim before content-main defines it, so the shim gets its own.
  return `${header()}\n(() => {\n'use strict';\n${core}\nconst t = makeT(null);\n${SHIM.replace('globalThis.__tdApi = {', 'globalThis.__tdApi = {')}\n{\n${main}\n}\n})();\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/truediscount.user.js', bundleUserscript());
  console.log('built dist/truediscount.user.js');
}
