import { lowestInWindow, trackedSince, DAY } from './history.js';

// status: 'real' | 'inflated' | 'higher' | 'nodata' | 'nodiscount'
export function evaluate({ price, oldPrice, history = [], now = Date.now() }) {
  const low30 = lowestInWindow(history, now, 30);
  const since = trackedSince(history);
  const days = since ? Math.floor((now - since) / DAY) : 0;
  const claimed = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
  const res = { price, oldPrice, low30, days, claimedPct: claimed, realPct: null };
  if (low30 == null) return { ...res, status: claimed ? 'nodata' : 'nodiscount' };
  res.realPct = Math.round((1 - price / low30) * 100);
  if (price > low30) return { ...res, status: 'higher' };
  if (!claimed) return { ...res, status: 'nodiscount' };
  if (oldPrice > low30 * 1.01) return { ...res, status: 'inflated' };
  return { ...res, status: 'real' };
}

export function message(v, fmt = x => x.toFixed(2)) {
  switch (v.status) {
    case 'real': return `Discount looks real: lowest price we saw in 30 days was ${fmt(v.low30)}.`;
    case 'inflated': return `Shop claims -${v.claimedPct}%, but we saw ${fmt(v.low30)} in the last 30 days. Real saving: ${Math.max(v.realPct, 0)}%.`;
    case 'higher': return `It was cheaper recently: ${fmt(v.low30)} in the last 30 days.`;
    case 'nodata': return `Shop claims -${v.claimedPct}%. No history yet; tracking starts now.`;
    default: return v.low30 != null ? `Lowest price seen in 30 days: ${fmt(v.low30)}.` : 'Tracking this price from today.';
  }
}
