// Export and import of the local price history as a plain JSON file.
import { DAY, RETENTION_DAYS } from './history.js';

export const FORMAT = 'truediscount-history';
export const VERSION = 1;
const MAX_ITEMS = 20000;
const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : undefined);

// Build the export object from everything in storage.local.
export function exportData(all = {}, now = Date.now()) {
  const items = {};
  for (const [k, v] of Object.entries(all)) if (Array.isArray(v?.history) && v.history.length) items[k] = v;
  return { format: FORMAT, version: VERSION, exported: new Date(now).toISOString(), items };
}

function cleanEntry(v, now) {
  if (!v || typeof v !== 'object' || !Array.isArray(v.history)) return null;
  const min = now - RETENTION_DAYS * DAY;
  const history = v.history
    .filter(p => p && Number.isFinite(p.t) && Number.isFinite(p.p) && p.p > 0 && p.p < 1e9 && p.t >= min && p.t <= now + DAY)
    .map(p => ({ t: Math.floor(p.t / DAY) * DAY, p: p.p }));
  if (!history.length) return null;
  const e = { name: str(v.name), currency: str(v.currency, 3), host: str(v.host, 253), history };
  if (v.watch && Number.isFinite(v.watch.target) && v.watch.target > 0)
    e.watch = { target: Math.round(v.watch.target * 100) / 100, since: Number.isFinite(v.watch.since) ? v.watch.since : now, alerted: null };
  for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k];
  return e;
}

// Parse and validate an exported file. Throws on anything that is not a truediscount export.
export function parseImport(text, now = Date.now()) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('not valid JSON'); }
  if (data?.format !== FORMAT) throw new Error('not a truediscount export');
  if (!(data.version >= 1 && data.version <= VERSION)) throw new Error('unsupported version');
  if (!data.items || typeof data.items !== 'object' || Array.isArray(data.items)) throw new Error('missing items');
  const keys = Object.keys(data.items);
  if (keys.length > MAX_ITEMS) throw new Error('too many items');
  const items = {};
  for (const k of keys) {
    if (k.length > 2048 || k.startsWith('site-')) continue;
    const e = cleanEntry(data.items[k], now);
    if (e) items[k] = e;
  }
  return items;
}

// Merge two histories: one point per day, the lowest price wins, 90-day cap kept.
export function mergeHistory(a = [], b = [], now = Date.now()) {
  const byDay = new Map();
  for (const p of [...a, ...b]) {
    const d = Math.floor(p.t / DAY) * DAY;
    byDay.set(d, Math.min(byDay.get(d) ?? Infinity, p.p));
  }
  const min = now - RETENTION_DAYS * DAY;
  return [...byDay].filter(([t]) => t >= min).map(([t, p]) => ({ t, p })).sort((x, y) => x.t - y.t);
}

// Returns the storage updates to apply and a count of new and merged products.
export function mergeImport(existing = {}, imported = {}, now = Date.now()) {
  const updates = {}; let added = 0, merged = 0;
  for (const [k, inc] of Object.entries(imported)) {
    const cur = existing[k];
    if (!cur?.history) { updates[k] = inc; added++; continue; }
    updates[k] = { ...inc, ...cur, watch: cur.watch ?? inc.watch, history: mergeHistory(cur.history, inc.history, now) };
    if (!updates[k].watch) delete updates[k].watch;
    merged++;
  }
  return { updates, added, merged };
}
