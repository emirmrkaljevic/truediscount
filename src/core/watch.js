// Price alerts: a watched product has a target price; we alert once each time
// a recorded price first drops to or below the target.
export function defaultTarget(price) {
  return Math.floor(price * 0.9 * 100) / 100;
}

export function setWatch(entry, target, now = Date.now()) {
  if (target == null) { const { watch, ...rest } = entry; return rest; }
  if (!(target > 0)) throw new Error('target must be a positive number');
  return { ...entry, watch: { target: Math.round(target * 100) / 100, since: now, alerted: null } };
}

// Returns { entry, alert } where alert is true when the user should be notified now.
export function checkWatch(entry, price, now = Date.now()) {
  const w = entry.watch;
  if (!w || price == null) return { entry, alert: false };
  if (price <= w.target) {
    if (w.alerted != null && price >= w.alerted) return { entry, alert: false };
    return { entry: { ...entry, watch: { ...w, alerted: price, alertedAt: now } }, alert: true };
  }
  // Price went back above the target: re-arm so the next drop alerts again.
  return { entry: w.alerted != null ? { ...entry, watch: { ...w, alerted: null } } : entry, alert: false };
}

export function reachedCount(all) {
  return Object.values(all).filter(e => e?.watch && e.history?.length && e.history.at(-1).p <= e.watch.target).length;
}
