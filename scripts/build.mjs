// Builds dist/truediscount-<browser>.zip with a browser specific manifest.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { SHOP_MATCHES } from '../src/hosts.js';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

export function manifest(browser) {
  const m = {
    manifest_version: 3,
    name: '__MSG_extName__',
    default_locale: 'en',
    short_name: 'truediscount',
    version: pkg.version,
    description: '__MSG_extDescription__',
    icons: { 16: 'icons/icon16.png', 32: 'icons/icon32.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' },
    action: { default_popup: 'src/popup/popup.html', default_icon: { 16: 'icons/icon16.png', 32: 'icons/icon32.png' } },
    permissions: ['storage', 'scripting', 'activeTab'],
    host_permissions: SHOP_MATCHES,
    optional_host_permissions: ['https://*/*'],
    content_scripts: [{ matches: SHOP_MATCHES, js: ['content.js'], run_at: 'document_idle' }],
  };
  if (browser === 'chrome') m.background = { service_worker: 'src/background.js', type: 'module' };
  else {
    m.background = { scripts: ['src/background.js'], type: 'module' };
    m.browser_specific_settings = { gecko: { id: 'truediscount@emirmrkaljevic.github.io', strict_min_version: '128.0',
      data_collection_permissions: { required: ['none'] } } };
  }
  return m;
}

// Content scripts cannot be ES modules, so inline the core modules into one classic script.
export function bundleContent() {
  const order = ['price', 'history', 'strings', 'verdict', 'sparkline', 'extract'].map(n => `src/core/${n}.js`).concat('src/content-main.js');
  const body = order.map(f => `// ${f}\n` + readFileSync(f, 'utf8').replace(/^import .*$/gm, '').replace(/^export /gm, '')).join('\n');
  return `(() => {\n${body}\n})();\n`;
}

function files(dir) {
  return readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : [p]; });
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = ~0; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };

function zip(entries) {
  const parts = [], central = []; let off = 0;
  for (const [name, data] of entries) {
    const n = Buffer.from(name), comp = deflateRawSync(data), crc = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8);
    h.writeUInt32LE(0x21, 10); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(n.length, 26);
    parts.push(h, n, comp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(0x21, 12); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, n); off += 30 + n.length + comp.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entries.length, 8); e.writeUInt16LE(entries.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rmSync('dist', { recursive: true, force: true }); mkdirSync('dist');
  const src = [...files('src'), ...files('icons'), ...files('_locales'), 'LICENSE'].map(f => [f, readFileSync(f)]);
  src.push(['content.js', Buffer.from(bundleContent())]);
  for (const b of ['chrome', 'firefox']) {
    const out = `dist/truediscount-${b}-${pkg.version}.zip`;
    writeFileSync(out, zip([['manifest.json', Buffer.from(JSON.stringify(manifest(b), null, 2))], ...src]));
    console.log('built', out);
  }
}
