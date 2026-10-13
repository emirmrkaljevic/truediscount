export const DAY = 86400000;
export const RETENTION_DAYS = 90;

// One point per calendar day (UTC): keep the lowest price seen that day.
export function addPoint(history = [], price, now = Date.now()) {
  if (price == null) return history;
  const day = Math.floor(now / DAY) * DAY;
  const out = history.filter(p => p.t >= now - RETENTION_DAYS * DAY);
  const existing = out.find(p => p.t === day);
  if (existing) existing.p = Math.min(existing.p, price);
  else out.push({ t: day, p: price });
  return out.sort((a, b) => a.t - b.t);
}

export function lowestInWindow(history = [], now = Date.now(), days = 30, excludeToday = true) {
  const today = Math.floor(now / DAY) * DAY;
  const pts = history.filter(p => p.t >= today - days * DAY && (!excludeToday || p.t < today));
  if (!pts.length) return null;
  return Math.min(...pts.map(p => p.p));
}

export function trackedSince(history = []) {
  return history.length ? history[0].t : null;
}
