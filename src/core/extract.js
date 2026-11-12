import { parsePrice } from './price.js';

// Old-price elements often hold a label and several renderings, e.g. "UVP 299,– €299,00€".
// Thousands can be grouped (1.299,99 / 1,299.99 / 1'299.00) or written in full (1299,99).
// The grouped form has to be tried before a short digit run, otherwise 1299,99 is read as 129
// and a Swiss 1'299.00 is read as 1, so the comparison never sees the real reference price.
const PRICE_TOKEN = /(?:\d{1,3}(?:[.,\u2019'\s]\d{3})+|\d+)(?:[.,]\d{1,2}|,[-\u2013])?/;
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
      name: p.name, sku: String(p.sku || p.gtin13 || p.mpn || '') || null, price,
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
  { id: 'amazon', host: /(^|\.)amazon\.(de|fr|it|es|nl|pl|se|ie|com\.be)$/,
    price: ['#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen', '#apex_desktop .apex-pricetopay-value .a-offscreen',
      '#corePrice_feature_div .a-price .a-offscreen', '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen', '#priceblock_ourprice'],
    old: ['#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen', '#apex_desktop .apex-basisprice-value .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-price.a-text-price .a-offscreen'],
    name: ['#productTitle'] },
  { id: 'zalando', host: /(^|\.)zalando\.[a-z.]+$/,
    old: ['[data-testid="pdp-price-container"] s', 'span[class*="strike"]', 'p s'] },
  { id: 'mediamarkt', host: /(^|\.)(mediamarkt|saturn|mediaworld)\.[a-z.]+$/,
    // lop/lowest are the shop's 30-day disclosure, not a claimed "was" price; shopLowest30 reads them.
    old: ['[data-test="mms-strike-price-type-rrp"]', '[data-test="mms-strike-price-type-previous"]', '[data-test*="strike-price"]'] },
  { id: 'otto', host: /(^|\.)otto\.de$/, old: ['.pdp_price__retail-price', '[data-qa="retailPrice"]'] },
  { id: 'emag', host: /(^|\.)emag\.(ro|bg|hu)$/, old: ['.product-new-price ~ .pricing .rrp-lp30d-content s', '.product-page-pricing .pricing s'] },
  { id: 'allegro', host: /(^|\.)allegro\.(pl|cz|sk)$/, old: ['[data-testid="price-old"]', 'div[aria-label*="przed obniżką"]'] },
  // Coolblue renders prices client-side; JSON-LD gives the current price and the labels below catch "Retail price".
  { id: 'coolblue', host: /(^|\.)coolblue\.(nl|be|de)$/, old: ['[class*="sales-price__former"]', '[data-testid*="reference-price"]'] },
  { id: 'bol', host: /(^|\.)bol\.com$/, old: ['.buy-block__list-price', '[data-test="list-price"]'] },
  // Lidl prints the label next to the struck price: "UVP: <s>599.00</s>" means RRP, a bare <s> is Lidl's own earlier price.
  { id: 'lidl', host: /(^|\.)lidl\.(de|at|fr|nl|be|it|es|pl|cz|sk|hu|ro|bg|hr|si|pt|ie|dk|se|fi)$/, price: ['.ods-price__value'], old: ['.ods-price__stroke-price s'] },
  { id: 'alternate', host: /(^|\.)alternate\.(de|nl|be|at)$/, price: ['#tle-details-price-section .price'], old: ['#tle-details-price-section .strike-price', '.strike-price'] },
  // Shelf price is [data-testid="pd-price"]. A later wrapper is the optional code price, and the
  // variant list repeats every size, so those are not the product price. The 30-day low is
  // recentMinPrice on the selected variant (printed as "Mindestpreis" or "Letzter niedrigster Preis").
  // The recommended price in that state is not crossed out, and JSON-LD lists every size.
  { id: 'notino', host: /(^|\.)notino\.(at|be|bg|ch|cz|de|dk|ee|es|fi|fr|gr|hr|hu|ie|it|lt|lv|nl|pl|pt|ro|se|si|sk)$/, name: ['h1'] },
  // Buy box is .price-section. "prezzo precedente" is the barred price, and the page defines it as
  // the lowest price charged in the 30 days before the promotion. "prezzo consigliato" is only the
  // manufacturer's recommended price. A later compare column repeats other prices.
  { id: 'euronics', host: /(^|\.)euronics\.it$/, name: ['h1'] },
  // Buy box is [data-testid="priceBox"] in the final view. finalPrice is the price on screen
  // ("Ab" or "From" is the price before a size is chosen). lowestProductPrice30D is the last
  // lowest price of the 30 days before the reduction. originalPrice ("Ursprünglich" or "Originally")
  // is the catalogue price, not that 30-day price. A hidden previous view repeats an older price.
  { id: 'aboutyou', host: /(^|\.)aboutyou\.(at|be|bg|com\.cy|cz|de|dk|ee|es|fi|fr|gr|hr|hu|it|lt|lu|lv|nl|pl|pt|ro|se|si|sk)$/, name: ['h1'] },
  // Buy box is .product-box-main__prices. The 30-day low is the "najniższa cena" line
  // (tooltip: "Najniższa cena z 30 dni przed obniżką"). A barred price is that same previous
  // price when the promotion shows one. "cena bez kodu" is the price without a discount code,
  // not the 30-day low. Another offer column repeats other prices.
  { id: 'morele', host: /(^|\.)morele\.net$/, name: ['h1'] },
  // Buy box is app-product-prices .custom-price-container. "Prezzo precedente"
  // is the lowest price charged in the 30 days before the promotion. "Prezzo
  // consigliato" is only the manufacturer's recommended price. A compare
  // column or related offer can repeat other prices.
  { id: 'unieuro', host: /(^|\.)unieuro\.it$/, name: ['h1'] },
];

// Text labels shops put next to a reference price, in the main EU languages.
const OLD_LABEL = /(?<!\p{L})(statt|vorher|bisher|uvp|was|previously|rrp|retail price|list price|prix (?:de référence|barré)|avant|prezzo (?:consigliato|precedente)|antes|pvpr|van|adviesprijs|przed obniżką|cena regularna|pret (?:vechi|întreg)|prp|eredeti ár)(?!\p{L})/iu;
const GENERIC_PRICE = ['[itemprop="price"]', '[data-price]', '[class*="current-price"]', '[class*="sale-price"]', '[class*="final-price"]', '[class*="product-price"]'];

const GENERIC_OLD = ['[style*="line-through"]', '[data-old-price]', '[class*="regular-price"]', '[class*="list-price"]', 'del', 's', '[class*="old-price"]', '[class*="oldPrice"]', '[class*="price-old"]', '[class*="was-price"]', '[class*="strike"]', '[class*="crossed"]'];

const NOTINO_VARIANT = '#pdVariantsTile, [data-testid="pd-variants-tile"]';
const NOTINO_LOW_LABEL = /Mindestpreis|Letzter niedrigster Preis/i;

function notinoSelectedId(doc) {
  const sel = doc.querySelector('a.pd-variant-selected, .pd-variant-selected');
  return sel?.id?.match(/(\d+)/)?.[1] || sel?.getAttribute('href')?.match(/\/p-(\d+)/)?.[1] || null;
}

function notinoShownPrice(doc) {
  const shelf = doc.querySelector('[data-testid="pd-price"]');
  const fromShelf = shelf && firstPrice(shelf.getAttribute('content') || shelf.textContent);
  if (fromShelf) return fromShelf;
  for (const el of doc.querySelectorAll('[data-testid="pd-price-wrapper"]')) {
    if (el.closest(`${NOTINO_VARIANT}, [data-testid="product-specifications"]`)) continue;
    const v = firstPrice(el.getAttribute('content') || el.textContent);
    if (v) return v;
  }
  return null;
}

function notinoVariant(doc) {
  const el = doc.getElementById('__APOLLO_STATE__');
  if (!el) return null;
  let data;
  try { data = JSON.parse(el.textContent.trim().replace(/;+$/, '')); } catch { return null; }
  const variants = Object.entries(data).filter(([k, v]) => /^CatalogVariant:\d+$/.test(k) && typeof v?.price?.value === 'number');
  if (!variants.length) return null;
  const id = notinoSelectedId(doc);
  if (id && typeof data[`CatalogVariant:${id}`]?.price?.value === 'number') return data[`CatalogVariant:${id}`];
  if (variants.length === 1) return variants[0][1];
  const shown = notinoShownPrice(doc);
  return (variants.find(([, v]) => v.price.value === shown) || variants[0])[1];
}

// Price that follows the label, so an earlier "Aktueller Preis" in the same line is not used.
function priceAfterLabel(label, raw) {
  const m = String(raw).match(label);
  return m ? firstPrice(String(raw).slice(m.index + m[0].length)) : null;
}

function notinoRead(doc) {
  const variant = notinoVariant(doc);
  const price = notinoShownPrice(doc) ?? (typeof variant?.price?.value === 'number' ? variant.price.value : null);
  if (price == null) return null;
  let shopLow30 = null;
  const recent = variant?.recentMinPrice?.value;
  if (typeof recent === 'number' && recent >= price * 0.2 && recent <= price * 20) shopLow30 = recent;
  if (shopLow30 == null && doc.body) {
    const walker = doc.createTreeWalker(doc.body, 4);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const tag = node.parentElement?.tagName;
      if (!node.nodeValue || node.nodeValue.length > 160) continue;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') continue;
      if (!NOTINO_LOW_LABEL.test(node.nodeValue) || node.parentElement.closest(NOTINO_VARIANT)) continue;
      const v = priceAfterLabel(NOTINO_LOW_LABEL, node.nodeValue);
      if (v && v >= price * 0.2 && v <= price * 20) { shopLow30 = v; break; }
    }
  }
  const currency = variant?.price?.currency;
  return {
    price, shopLow30,
    currency: typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? currency : null,
    sku: variant?.webId != null ? String(variant.webId) : null,
  };
}

const EURONICS_PREVIOUS = /(?<!\p{L})precedente(?!\p{L})/iu;
const EURONICS_RRP = /(?<!\p{L})consigliato(?!\p{L})/iu;

function euronicsRead(doc) {
  const box = doc.querySelector('.price-section');
  if (!box) return null;
  const priceEl = box.querySelector('.pcs-price');
  const price = priceEl ? (parsePrice(priceEl.getAttribute('data-price')) ?? firstPrice(priceEl.textContent)) : null;
  if (price == null) return null;
  const near = v => typeof v === 'number' && v >= price * 0.2 && v <= price * 20;
  let previous = null, rrp = null;
  for (const el of box.querySelectorAll('.recomanded-pricebook')) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const v = firstPrice(label);
    if (!near(v)) continue;
    if (EURONICS_PREVIOUS.test(label)) previous = v;
    else if (EURONICS_RRP.test(label)) rrp = v;
  }
  let oldPrice = null, oldKind = null, shopLow30 = null;
  if (previous != null) {
    shopLow30 = previous;
    if (previous > price) { oldPrice = previous; oldKind = 'previous'; }
  }
  if (oldPrice == null && rrp != null && rrp > price) { oldPrice = rrp; oldKind = 'rrp'; }
  return { price, oldPrice, oldKind, shopLow30 };
}

// Symbol next to the price. "kr" is shared by several currencies, so it is left to JSON-LD.
function currencyIn(text) {
  const t = String(text || '');
  if (/zł|\bPLN\b/i.test(t)) return 'PLN';
  if (/\bCHF\b/.test(t)) return 'CHF';
  if (/Kč|\bCZK\b/.test(t)) return 'CZK';
  if (/\bFt\b|\bHUF\b/.test(t)) return 'HUF';
  if (/\blei\b|\bRON\b/i.test(t)) return 'RON';
  if (/\bSEK\b/.test(t)) return 'SEK';
  if (/\bDKK\b/.test(t)) return 'DKK';
  if (/€|\bEUR\b/.test(t)) return 'EUR';
  return null;
}

function aboutyouBox(doc) {
  const view = doc.querySelector('[data-view-state="data-final-view"]');
  const boxed = view?.querySelector('[data-testid="priceBox"]');
  if (boxed) return boxed;
  for (const box of doc.querySelectorAll('[data-testid="priceBox"]')) {
    let hidden = false;
    for (let n = box; n; n = n.parentElement) {
      if (n.getAttribute?.('data-view-state') === 'data-previous-view') { hidden = true; break; }
    }
    if (!hidden) return box;
  }
  return null;
}

function aboutyouRead(doc) {
  const box = aboutyouBox(doc);
  if (!box) return null;
  const priceEl = box.querySelector('[data-testid="finalPrice"]');
  const price = priceEl ? firstPrice(priceEl.textContent) : null;
  if (price == null) return null;
  const near = v => typeof v === 'number' && v >= price * 0.2 && v <= price * 20;
  const lowEl = box.querySelector('[data-testid="lowestProductPrice30D"] [data-value="true"]');
  const lowRaw = lowEl ? firstPrice(lowEl.textContent) : null;
  const low = near(lowRaw) ? lowRaw : null;
  const origEl = box.querySelector('[data-testid="originalPrice"]');
  const original = origEl && near(firstPrice(origEl.textContent)) ? firstPrice(origEl.textContent) : null;
  let oldPrice = null, oldKind = null;
  // A struck price inside the 30-day row is the reference for the percentage. The original
  // price is a catalogue price and stays out of the 30-day comparison.
  const struck = !!(lowEl && lowEl.querySelector('s, del'));
  if (low != null && low > price && struck) {
    oldPrice = low; oldKind = 'previous';
  } else if (original != null && original > price && (low == null || Math.abs(original - low) > 0.009)) {
    oldPrice = original; oldKind = 'rrp';
  } else if (low != null && low > price) {
    oldPrice = low; oldKind = 'previous';
  }
  const canon = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  return {
    price, oldPrice, oldKind, shopLow30: low,
    currency: currencyIn(box.textContent),
    sku: canon.match(/-(\d+)\/?(?:[?#].*)?$/)?.[1] || null,
  };
}

function unieuroBox(doc) {
  return doc.querySelector('app-product-prices[inproductdetail] .custom-price-container')
    || doc.querySelector('app-product-prices .custom-price-container')
    || doc.querySelector('.custom-price-container');
}

function unieuroRead(doc) {
  const box = unieuroBox(doc);
  if (!box) return null;
  const price = firstPrice(box.querySelector('.current-price')?.textContent);
  if (price == null) return null;
  const near = v => typeof v === 'number' && v >= price * 0.2 && v <= price * 20;
  const previous = firstPrice(box.querySelector('.previous-price')?.textContent);
  const suggested = firstPrice(box.querySelector('.suggested-price')?.textContent);
  let oldPrice = null, oldKind = null, shopLow30 = null;
  if (near(previous)) {
    shopLow30 = previous;
    if (previous > price) { oldPrice = previous; oldKind = 'previous'; }
  }
  if (oldPrice == null && near(suggested) && suggested > price) {
    oldPrice = suggested; oldKind = 'rrp';
  }
  const canon = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
  return {
    price, oldPrice, oldKind, shopLow30,
    currency: currencyIn(box.textContent) || 'EUR',
    sku: canon.match(/-pid([A-Za-z0-9]+)\/?(?:[?#].*)?$/i)?.[1] || null,
  };
}

function moreleRead(doc) {
  const box = doc.querySelector('.product-box-main__prices .price-box');
  if (!box) return null;
  const priceEl = box.querySelector('#product_price, [data-testid="product-price"]');
  const price = priceEl ? (parsePrice(priceEl.getAttribute('data-price')) ?? firstPrice(priceEl.textContent)) : null;
  if (price == null) return null;
  const near = v => typeof v === 'number' && v >= price * 0.2 && v <= price * 20;
  const lowEl = box.querySelector('[data-testid="product-lowest-price"]');
  const lowRaw = lowEl ? firstPrice(lowEl.textContent) : null;
  const shopLow30 = near(lowRaw) ? lowRaw : null;
  const crossed = firstPrice(box.querySelector('.product-price-old')?.textContent);
  const regular = firstPrice(box.querySelector('[data-testid="product-regular-price"]')?.textContent);
  let oldPrice = null, oldKind = null;
  if (near(crossed) && crossed > price) { oldPrice = crossed; oldKind = 'previous'; }
  else if (near(regular) && regular > price && (shopLow30 == null || Math.abs(regular - shopLow30) > 0.009)) {
    oldPrice = regular; oldKind = 'previous';
  }
  if (oldPrice == null && shopLow30 != null && shopLow30 > price) { oldPrice = shopLow30; oldKind = 'previous'; }
  const sku = doc.querySelector('[data-mini-golden-box-product-id-value]')?.getAttribute('data-mini-golden-box-product-id-value') || null;
  return { price, oldPrice, oldKind, shopLow30, currency: currencyIn(box.textContent), sku };
}

export function extract(doc, host) {
  const adapter = ADAPTERS.find(a => a.host.test(host)) || null;
  const base = fromJsonLd(doc) || fromMicrodata(doc) || {};
  const notino = adapter?.id === 'notino' ? notinoRead(doc) : null;
  const euronics = adapter?.id === 'euronics' ? euronicsRead(doc) : null;
  const aboutyou = adapter?.id === 'aboutyou' ? aboutyouRead(doc) : null;
  const morele = adapter?.id === 'morele' ? moreleRead(doc) : null;
  const unieuro = adapter?.id === 'unieuro' ? unieuroRead(doc) : null;
  let price = unieuro?.price ?? morele?.price ?? aboutyou?.price ?? euronics?.price ?? notino?.price ?? base.price ?? null;
  if (!notino && !euronics && !aboutyou && !morele && !unieuro && adapter?.price) price = firstPrice(text(doc, adapter.price)) ?? price;
  if (price == null) price = genericPrice(doc);
  if (price == null) return null;
  const sels = [...(adapter?.old || []), ...GENERIC_OLD];
  let oldPrice = null, oldKind = null, oldHint = '';
  for (const s of sels) {
    for (const el of doc.querySelectorAll(s)) {
      const v = firstPrice(el.textContent);
      if (v && v > price && v < price * 20) {
        oldHint = el.previousElementSibling?.getAttribute('data-bs-content') || '';
        const own = el.textContent.replace(/\s+/g, ' ').trim();
        const dataTest = el.getAttribute('data-test') || '';
        // MediaMarkt lop/lowest marks are the 30-day disclosure only, not a claimed "was" price.
        if (isLow30Label(own) || /strike-price-type-(lop|lowest)/i.test(s) || /strike-price-type-(lop|lowest)/i.test(dataTest)) continue;
        oldPrice = v;
        const label = (el.parentElement?.textContent || '').length < 60 ? el.parentElement.textContent : '';
        // A recommended retail price is not the shop's own previous price.
        oldKind = /rrp|uvp|retail price|adviesprijs|\bmsrp\b/i.test(`${s} ${el.textContent} ${label} ${oldHint}`) ? 'rrp' : 'previous';
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
  // Notino's first JSON-LD offer is often another size, or the price before a code. That strikethrough
  // is not the selected size's earlier shop price. A recommended price kept only in page state is ignored too.
  if (notino && oldPrice != null && oldPrice === base.listPrice) { oldPrice = null; oldKind = null; }
  // The buy box is the price on screen. A compare column is not the reference for this product.
  if (euronics) { oldPrice = euronics.oldPrice; oldKind = euronics.oldKind; }
  if (aboutyou) { oldPrice = aboutyou.oldPrice; oldKind = aboutyou.oldKind; }
  if (morele) { oldPrice = morele.oldPrice; oldKind = morele.oldKind; }
  if (unieuro) { oldPrice = unieuro.oldPrice; oldKind = unieuro.oldKind; }
  const name = (adapter?.name && text(doc, adapter.name)?.trim()) || base.name || null;
  const shopLow30 = unieuro ? unieuro.shopLow30 : morele ? morele.shopLow30 : aboutyou ? aboutyou.shopLow30 : euronics ? euronics.shopLow30 : (notino?.shopLow30 ?? shopLowest30(doc, price) ?? (oldPrice && isLow30Label(oldHint) ? oldPrice : null));
  return {
    adapter: adapter?.id || 'generic', name, price, oldPrice, oldKind, shopLow30,
    sku: unieuro?.sku || morele?.sku || aboutyou?.sku || notino?.sku || base.sku || null,
    currency: unieuro?.currency || morele?.currency || aboutyou?.currency || notino?.currency || base.currency || 'EUR',
  };
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
    if (v && v > price && v < price * 20) return [v, /uvp|rrp|retail price|consigliato|pvpr|adviesprijs|prp/i.test(t) ? 'rrp' : 'previous'];
  }
  return null;
}

// Omnibus disclosures: "Niedrigster Preis der letzten 30 Tage: 49,99 €" and the like.
const LOW_WORD = /(lowest|30-day low|niedrigste|tiefstpreis|günstigste|bestpreis|le plus bas|più basso|más bajo|mais baixo|laagste|najniższa|cel mai mic|nejnižší|najniža|najnižja|legalacsonyabb|lägsta|laveste|alhaisin|nižšia|nejnižší)/iu;
const DAYS_30 = /30[\s\u00a0-]*(?:tage?n?|days?|derniers jours|jours|giorni|gg|días|dias|dagen|dagarna|dage|päivän|dni|dní|dnů|de zile|zile|dana|dni|nap)/giu;
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);

const isLow30Label = t => t.length <= 160 && LOW_WORD.test(t) && /30/.test(t);
const priceIn = t => firstPrice(t.replace(DAYS_30, ' ').replace(/\(\s*30\s*\)/g, ' '));

export function shopLowest30(doc, price) {
  const ok = v => v && v >= price * 0.2 && v <= price * 20;
  const clean = el => el.textContent.replace(/\s+/g, ' ').trim();
  // Walk text nodes only and climb to the smallest element holding the whole label.
  const walker = doc.createTreeWalker(doc.body, 4);
  const seen = new Set();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!LOW_WORD.test(node.nodeValue)) continue;
    let el = node.parentElement;
    if (!el || SKIP.has(el.tagName)) continue;
    for (let i = 0; i < 3 && el.parentElement && !isLow30Label(clean(el)) && clean(el.parentElement).length <= 160; i++) el = el.parentElement;
    if (seen.has(el) || !isLow30Label(clean(el))) continue;
    seen.add(el);
    let v = priceIn(clean(el));
    if (!ok(v) && el.nextElementSibling) v = priceIn(el.nextElementSibling.textContent);
    if (!ok(v) && el.parentElement && el.parentElement.textContent.length <= 200) v = priceIn(el.parentElement.textContent);
    if (ok(v)) return v;
  }
  return null;
}

export function productKey(url) {
  const u = new URL(url);
  const asin = u.pathname.match(/\/dp\/([A-Z0-9]{10})/);
  return u.hostname.replace(/^www\./, '') + (asin ? `/dp/${asin[1]}` : u.pathname.replace(/\/$/, ''));
}
