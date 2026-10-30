import { DAY, lowestInWindow } from './history.js';

// Turns stored entries into rows for the popup watchlist.
// drop is how far the latest price sits below the highest price seen in the last 30 days (0..1).
export function productUrl(key) {
  return /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(key) ? 'https://' + key : null;
}

export function watchlistRows(all, now = Date.now()) {
  const rows = [];
  for (const [key, v] of Object.entries(all || {})) {
    if (!v?.history?.length) continue;
    const last = v.history.at(-1);
    const recent = v.history.filter(p => p.t >= now - 30 * DAY);
    const high = recent.length ? Math.max(...recent.map(p => p.p)) : last.p;
    const low = lowestInWindow(v.history, now, 30, false) ?? last.p;
    rows.push({
      key, name: v.name || key, url: productUrl(key), currency: v.currency || 'EUR',
      price: last.p, low30: low, high30: high, seen: last.t, days: recent.length,
      drop: high > 0 ? Math.max(0, (high - last.p) / high) : 0,
      atLow: last.p <= low, watch: v.watch || null,
      hit: !!v.watch && last.p <= v.watch.target,
    });
  }
  return rows;
}

export function sortRows(rows, mode = 'recent') {
  const r = [...rows];
  if (mode === 'drop') r.sort((a, b) => b.drop - a.drop || b.atLow - a.atLow || b.seen - a.seen);
  else r.sort((a, b) => (!!b.watch - !!a.watch) || b.seen - a.seen);
  return r;
}

// Case- and accent-insensitive match on product name or shop key; every word must match.
const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function filterRows(rows, query = '') {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return rows;
  return rows.filter(r => { const hay = fold(r.name + ' ' + r.key); return words.every(w => hay.includes(w)); });
}
