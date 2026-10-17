import { makeT } from './strings.js';
import { lowestInWindow, trackedSince, DAY } from './history.js';

// status: 'real' | 'inflated' | 'higher' | 'nodata' | 'nodiscount'
export function evaluate({ price, oldPrice, oldKind = 'previous', shopLow30 = null, history = [], now = Date.now() }) {
  const seenLow = lowestInWindow(history, now, 30);
  // The shop's own "lowest price in 30 days" disclosure lets us judge on the first visit.
  const low30 = seenLow == null ? shopLow30 : shopLow30 == null ? seenLow : Math.min(seenLow, shopLow30);
  const source = low30 == null ? null : low30 === seenLow ? 'seen' : 'shop';
  const since = trackedSince(history);
  const days = since ? Math.floor((now - since) / DAY) : 0;
  const claimed = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
  const res = { price, oldPrice, oldKind, low30, source, days, claimedPct: claimed, realPct: null };
  if (low30 == null) return { ...res, status: claimed ? 'nodata' : 'nodiscount' };
  res.realPct = Math.round((1 - price / low30) * 100);
  if (price > low30) return { ...res, status: 'higher' };
  if (!claimed) return { ...res, status: 'nodiscount' };
  if (oldPrice > low30 * 1.01) return { ...res, status: 'inflated' };
  return { ...res, status: 'real' };
}

export function message(v, fmt = x => x.toFixed(2), t = makeT()) {
  let base = baseMessage(v, fmt, t);
  if (v.source === 'shop' && !['nodata', 'inflated'].includes(v.status)) base = `${base} ${t('msgSourceShop')}`;
  return v.oldKind === 'rrp' && v.claimedPct ? `${base} ${t('msgRrp')}` : base;
}

function baseMessage(v, fmt, t) {
  switch (v.status) {
    case 'real': return t('msgReal', [fmt(v.low30)]);
    case 'inflated': return t(v.source === 'shop' ? 'msgInflatedShop' : 'msgInflated', [v.claimedPct, fmt(v.low30), Math.max(v.realPct, 0)]);
    case 'higher': return t('msgHigher', [fmt(v.low30)]);
    case 'nodata': return t('msgNodata', [v.claimedPct]);
    default: return v.low30 != null ? t('msgLowest', [fmt(v.low30)]) : t('msgTracking');
  }
}
