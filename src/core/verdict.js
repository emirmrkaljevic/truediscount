import { makeT } from './strings.js';
import { lowestInWindow, trackedSince, DAY } from './history.js';

// status: 'real' | 'inflated' | 'higher' | 'nodata' | 'nodiscount'
export function evaluate({ price, oldPrice, oldKind = 'previous', history = [], now = Date.now() }) {
  const low30 = lowestInWindow(history, now, 30);
  const since = trackedSince(history);
  const days = since ? Math.floor((now - since) / DAY) : 0;
  const claimed = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
  const res = { price, oldPrice, oldKind, low30, days, claimedPct: claimed, realPct: null };
  if (low30 == null) return { ...res, status: claimed ? 'nodata' : 'nodiscount' };
  res.realPct = Math.round((1 - price / low30) * 100);
  if (price > low30) return { ...res, status: 'higher' };
  if (!claimed) return { ...res, status: 'nodiscount' };
  if (oldPrice > low30 * 1.01) return { ...res, status: 'inflated' };
  return { ...res, status: 'real' };
}

export function message(v, fmt = x => x.toFixed(2), t = makeT()) {
  const base = baseMessage(v, fmt, t);
  return v.oldKind === 'rrp' && v.claimedPct ? `${base} ${t('msgRrp')}` : base;
}

function baseMessage(v, fmt, t) {
  switch (v.status) {
    case 'real': return t('msgReal', [fmt(v.low30)]);
    case 'inflated': return t('msgInflated', [v.claimedPct, fmt(v.low30), Math.max(v.realPct, 0)]);
    case 'higher': return t('msgHigher', [fmt(v.low30)]);
    case 'nodata': return t('msgNodata', [v.claimedPct]);
    default: return v.low30 != null ? t('msgLowest', [fmt(v.low30)]) : t('msgTracking');
  }
}
