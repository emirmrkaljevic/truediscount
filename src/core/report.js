// Builds a prefilled GitHub issue link for a shop where detection fails.
// Only the shop's host name and what was detected are included: no full URL, no history.
export const ISSUES = 'https://github.com/emirmrkaljevic/truediscount/issues/new';

export function summarizeDetection(info) {
  if (info === undefined) return 'extension not active on this site';
  if (!info) return 'no product price found';
  const yes = v => (v != null ? 'found' : 'not found');
  return `adapter: ${info.adapter}; price: ${yes(info.price)}; crossed-out price: ${yes(info.oldPrice)}; 30-day disclosure: ${yes(info.shopLow30)}`;
}

export function reportUrl({ pageUrl, version, browser, detection }) {
  let host = '';
  try { host = new URL(pageUrl).hostname.replace(/^www\./, ''); } catch { /* not a web page */ }
  const params = new URLSearchParams({
    template: 'broken-shop.yml',
    title: `Shop not detected correctly: ${host || 'unknown'}`,
    labels: 'shop',
    shop: host,
    version: `${version} (${browser})`,
    detected: detection,
  });
  return `${ISSUES}?${params}`;
}
