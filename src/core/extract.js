import { parsePrice } from './price.js';

// Old-price elements often hold a label and several renderings, e.g. "UVP 299,– €299,00€".
const PRICE_TOKEN = /\d{1,3}(?:[.\s\u00a0]\d{3})*(?:[.,]\d{1,2}|,[-\u2013])?|\d+(?:[.,]\d{1,2})?/;
export function firstPrice(str) {
  const m = String(str ?? '').match(PRICE_TOKEN);
  return m ? parsePrice(m[0].replace(/,[-\u2013]$/, '')) : null;
}

const text = (doc, sel) => {
  for (const s of [].concat(sel)) {
    const el = doc.querySelector(s);
    if (el) return el.getAttribute('content') || el.textContent;
  }
  return null;
};

function walkJsonLd(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(n => walkJsonLd(n, out));
  const type = [].concat(node['@type'] || []);
  if (type.includes('Product')) out.push(node);
  // Products also appear nested, e.g. BuyAction.object or ProductGroup.hasVariant.
  for (const [k, v] of Object.entries(node)) if (k !== 'offers' && v && typeof v === 'object') walkJsonLd(v, out);
}

export function fromJsonLd(doc) {
  const products = [];
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { walkJsonLd(JSON.parse(s.textContent), products); } catch { /* ignore broken blocks */ }
  }
  for (const p of products) {
    let offer = [].concat(p.offers || [])[0];
    if (offer && offer['@type'] === 'AggregateOffer') offer = { price: offer.lowPrice, priceCurrency: offer.priceCurrency };
    const specs = [].concat(offer?.priceSpecification || []);
    const sale = specs.find(x => !x.priceType || /SalePrice/i.test(x.priceType));
    const list = specs.find(x => /StrikethroughPrice|ListPrice|MSRP/i.test(x.priceType || ''));
    const price = parsePrice(offer?.price ?? sale?.price);
    if (price != null) return {
      name: p.name, sku: p.sku || p.gtin13 || p.mpn || null, price,
      currency: offer.priceCurrency || sale?.priceCurrency || null,
      listPrice: parsePrice(list?.price), listKind: /MSRP/i.test(list?.priceType || '') ? 'rrp' : 'previous',
    };
  }
  return null;
}

export function fromMicrodata(doc) {
  const price = parsePrice(text(doc, ['[itemprop="price"]', 'meta[property="product:price:amount"]', 'meta[property="og:price:amount"]']));
  if (price == null) return null;
  return {
    name: text(doc, ['[itemprop="name"]', 'meta[property="og:title"]'])?.trim() || null,
    sku: null, price,
    currency: text(doc, ['[itemprop="priceCurrency"]', 'meta[property="product:price:currency"]', 'meta[property="og:price:currency"]']),
  };
}

// Per-shop selectors for the advertised "old" price (and price when needed).
export const ADAPTERS = [
  { id: 'amazon', host: /(^|\.)amazon\.(de|fr|it|es|nl|pl|se|com\.be)$/,
    price: ['#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen', '#apex_desktop .apex-pricetopay-value .a-offscreen',
      '#corePrice_feature_div .a-price .a-offscreen', '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen', '#priceblock_ourprice'],
    old: ['#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen', '#apex_desktop .apex-basisprice-value .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-price.a-text-price .a-offscreen'],
    name: ['#productTitle'] },
  { id: 'zalando', host: /(^|\.)zalando\.[a-z.]+$/,
    old: ['[data-testid="pdp-price-container"] s', 'span[class*="strike"]', 'p s'] },
  { id: 'mediamarkt', host: /(^|\.)(mediamarkt|saturn)\.[a-z.]+$/,
    old: ['[data-test="mms-strike-price-type-lop"]', '[data-test="mms-strike-price-type-lowest"]', '[data-test="mms-strike-price-type-rrp"]', '[data-test*="strike-price"]'] },
  { id: 'otto', host: /(^|\.)otto\.de$/, old: ['.pdp_price__retail-price', '[data-qa="retailPrice"]'] },
  { id: 'emag', host: /(^|\.)emag\.(ro|bg|hu)$/, old: ['.product-new-price ~ .pricing .rrp-lp30d-content s', '.product-page-pricing .pricing s'] },
  { id: 'allegro', host: /(^|\.)allegro\.(pl|cz|sk)$/, old: ['[data-testid="price-old"]', 'div[aria-label*="przed obniżką"]'] },
  { id: 'bol', host: /(^|\.)bol\.com$/, old: ['.buy-block__list-price', '[data-test="list-price"]'] },
];

// Text labels shops put next to a reference price, in the main EU languages.
const OLD_LABEL = /(?<!\p{L})(statt|vorher|bisher|uvp|was|previously|rrp|list price|prix (?:de référence|barré)|avant|prezzo (?:consigliato|precedente)|antes|pvpr|van|adviesprijs|przed obniżką|cena regularna|pret (?:vechi|întreg)|prp|eredeti ár|lowest price)(?!\p{L})/iu;
const GENERIC_PRICE = ['[itemprop="price"]', '[data-price]', '[class*="current-price"]', '[class*="sale-price"]', '[class*="final-price"]', '[class*="product-price"]'];

const GENERIC_OLD = ['[style*="line-through"]', '[data-old-price]', '[class*="regular-price"]', '[class*="list-price"]', 'del', 's', '[class*="old-price"]', '[class*="oldPrice"]', '[class*="price-old"]', '[class*="was-price"]', '[class*="strike"]', '[class*="crossed"]'];

export function extract(doc, host) {
  const adapter = ADAPTERS.find(a => a.host.test(host)) || null;
  const base = fromJsonLd(doc) || fromMicrodata(doc) || {};
  let price = base.price ?? null;
  if (adapter?.price) price = firstPrice(text(doc, adapter.price)) ?? price;
  if (price == null) price = genericPrice(doc);
  if (price == null) return null;
  const sels = [...(adapter?.old || []), ...GENERIC_OLD];
  let oldPrice = null, oldKind = null;
  for (const s of sels) {
    for (const el of doc.querySelectorAll(s)) {
      const v = firstPrice(el.textContent);
      if (v && v > price && v < price * 20) {
        oldPrice = v;
        // A recommended retail price is not the shop's own previous price.
        oldKind = /rrp|uvp|\bmsrp\b/i.test(s + ' ' + el.textContent) ? 'rrp' : 'previous';
        break;
      }
    }
    if (oldPrice) break;
  }
  if (!oldPrice) {
    const labelled = labelledOldPrice(doc, price);
    if (labelled) [oldPrice, oldKind] = labelled;
  }
  if (!oldPrice && base.listPrice > price) [oldPrice, oldKind] = [base.listPrice, base.listKind];
  const name = (adapter?.name && text(doc, adapter.name)?.trim()) || base.name || null;
  return { adapter: adapter?.id || 'generic', name, sku: base.sku || null, price, oldPrice, oldKind, currency: base.currency || 'EUR' };
}

function genericPrice(doc) {
  for (const s of GENERIC_PRICE) {
    const el = doc.querySelector(s);
    if (!el || el.closest('del, s')) continue;
    const v = parsePrice(el.getAttribute('content') || el.getAttribute('data-price')) ?? firstPrice(el.textContent);
    if (v) return v;
  }
  return null;
}

// Short elements such as "statt 49,99 €" or "UVP: 299 €".
function labelledOldPrice(doc, price) {
  for (const el of doc.querySelectorAll('span, p, div, small, li')) {
    const t = el.textContent;
    if (t.length > 60 || !OLD_LABEL.test(t)) continue;
    const v = firstPrice(t.replace(OLD_LABEL, ' '));
    if (v && v > price && v < price * 20) return [v, /uvp|rrp|consigliato|pvpr|adviesprijs|prp/i.test(t) ? 'rrp' : 'previous'];
  }
  return null;
}

export function productKey(url) {
  const u = new URL(url);
  const asin = u.pathname.match(/\/dp\/([A-Z0-9]{10})/);
  return u.hostname.replace(/^www\./, '') + (asin ? `/dp/${asin[1]}` : u.pathname.replace(/\/$/, ''));
}
