// Sites where the user chose to hide the badge. Stored locally under one key.
export const HIDDEN_KEY = '_hiddenSites';

export function normalizeHost(h) {
  return String(h || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/[/:].*$/, '').replace(/^www\./, '').replace(/\.$/, '');
}

export function isValidHost(h) {
  return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h);
}

// A hidden domain also covers its subdomains (hiding otto.de hides m.otto.de).
export function isHidden(list, host) {
  const h = normalizeHost(host);
  return (list || []).some(d => h === d || h.endsWith('.' + d));
}

export function addHidden(list, host) {
  const h = normalizeHost(host);
  if (!isValidHost(h) || isHidden(list, h)) return [...(list || [])];
  return [...(list || []), h].sort();
}

export function removeHidden(list, host) {
  const h = normalizeHost(host);
  return (list || []).filter(d => d !== h && !h.endsWith('.' + d));
}
