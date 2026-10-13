// Parse European and English price strings into numbers.
export function parsePrice(input) {
  if (input == null) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  let s = String(input).replace(/\u00a0|\s/g, '').replace(/[^\d.,-]/g, '');
  if (!/\d/.test(s)) return null;
  s = s.replace(/[,.]-+$/, '');
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma > -1) {
    const dec = s.length - lastComma - 1;
    s = dec === 3 && s.indexOf(',') === lastComma ? s.replace(',', '') : s.replace(/,/g, (m, i) => (i === lastComma ? '.' : ''));
  } else if (lastDot > -1) {
    const dec = s.length - lastDot - 1;
    if (dec === 3 && (s.match(/\./g) || []).length >= 1 && s.split('.')[0].length <= 3 && s.split('.').length > 1 && dec === 3) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function formatPrice(value, currency = 'EUR', locale = 'en-IE') {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value); }
  catch { return `${value.toFixed(2)} ${currency}`; }
}
