import { parsePrice } from './price.js';

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
  if (node['@graph']) walkJsonLd(node['@graph'], out);
}

export function fromJsonLd(doc) {
  const products = [];
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { walkJsonLd(JSON.parse(s.textContent), products); } catch { /* ignore broken blocks */ }
  }
  for (const p of products) {
    let offer = [].concat(p.offers || [])[0];
    if (offer && offer['@type'] === 'AggregateOffer') offer = { price: offer.lowPrice, priceCurrency: offer.priceCurrency };
    const price = parsePrice(offer?.price ?? offer?.priceSpecification?.price);
    if (price != null) return { name: p.name, sku: p.sku || p.gtin13 || p.mpn || null, price, currency: offer.priceCurrency || null };
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
    price: ['#corePrice_feature_div .a-price .a-offscreen', '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen', '#priceblock_ourprice'],
    old: ['#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen', '.a-price.a-text-price .a-offscreen'],
    name: ['#productTitle'] },
  { id: 'zalando', host: /(^|\.)zalando\.[a-z.]+$/,
    old: ['[data-testid="pdp-price-container"] s', 'span[class*="strike"]', 'p s'] },
  { id: 'mediamarkt', host: /(^|\.)(mediamarkt|saturn)\.[a-z.]+$/,
    old: ['[data-test="mms-strike-price-type-lowest"] span', '[data-test="mms-strike-price"] span', '[data-test*="strike"]'] },
  { id: 'otto', host: /(^|\.)otto\.de$/, old: ['.pdp_price__retail-price', '[data-qa="retailPrice"]'] },
  { id: 'emag', host: /(^|\.)emag\.(ro|bg|hu)$/, old: ['.product-new-price ~ .pricing .rrp-lp30d-content s', '.product-page-pricing .pricing s'] },
  { id: 'allegro', host: /(^|\.)allegro\.(pl|cz|sk)$/, old: ['[data-testid="price-old"]', 'div[aria-label*="przed obniżką"]'] },
  { id: 'bol', host: /(^|\.)bol\.com$/, old: ['.buy-block__list-price', '[data-test="list-price"]'] },
];

const GENERIC_OLD = ['del', 's', '[class*="old-price"]', '[class*="oldPrice"]', '[class*="price-old"]', '[class*="was-price"]', '[class*="strike"]', '[class*="crossed"]'];

export function extract(doc, host) {
  const adapter = ADAPTERS.find(a => a.host.test(host)) || null;
  const base = fromJsonLd(doc) || fromMicrodata(doc) || {};
  let price = base.price ?? null;
  if (adapter?.price) price = parsePrice(text(doc, adapter.price)) ?? price;
  if (price == null) return null;
  const sels = [...(adapter?.old || []), ...GENERIC_OLD];
  let oldPrice = null;
  for (const s of sels) {
    for (const el of doc.querySelectorAll(s)) {
      const v = parsePrice(el.textContent);
      if (v && v > price && v < price * 20) { oldPrice = v; break; }
    }
    if (oldPrice) break;
  }
  const name = (adapter?.name && text(doc, adapter.name)?.trim()) || base.name || null;
  return { adapter: adapter?.id || 'generic', name, sku: base.sku || null, price, oldPrice, currency: base.currency || 'EUR' };
}

export function productKey(url) {
  const u = new URL(url);
  const asin = u.pathname.match(/\/dp\/([A-Z0-9]{10})/);
  return u.hostname.replace(/^www\./, '') + (asin ? `/dp/${asin[1]}` : u.pathname.replace(/\/$/, ''));
}
