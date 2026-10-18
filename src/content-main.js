import { extract, productKey } from './core/extract.js';
import { evaluate, message } from './core/verdict.js';
import { sparkline } from './core/sparkline.js';
import { formatPrice } from './core/price.js';
import { addPoint } from './core/history.js';
import { makeT } from './core/strings.js';

const api = globalThis.browser ?? globalThis.chrome;
const COLORS = { real: '#15803d', inflated: '#b91c1c', higher: '#c2410c', nodata: '#475569', nodiscount: '#475569' };
const t = makeT(api.i18n?.getMessage?.bind(api.i18n));
const LABEL_KEYS = { real: 'labelReal', inflated: 'labelInflated', higher: 'labelHigher', nodata: 'labelNodata', nodiscount: 'labelNodiscount' };

const TEMPLATE = `
    <div hidden></div><style>
      .box{position:fixed;right:16px;bottom:16px;z-index:2147483647;font:13px/1.4 system-ui,sans-serif;background:#fff;color:#0f172a;
        border-left:6px solid var(--c);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.18);padding:10px 12px;max-width:280px}
      .t{font-weight:700;color:var(--c);display:flex;justify-content:space-between;gap:8px}
      button{border:0;background:none;cursor:pointer;font-size:14px;color:#64748b}
      .m{margin:4px 0}.s{color:#64748b;font-size:11px}
    </style>
    <div class="t"><span></span><button title="Close" aria-label="Close">×</button></div>
    <div class="m"></div><div class="g"></div><div class="s"></div>`;

function render(info, v, history) {
  document.getElementById('truediscount-host')?.remove();
  const host = document.createElement('div');
  host.id = 'truediscount-host';
  const root = host.attachShadow({ mode: 'closed' });
  const fmt = x => formatPrice(x, info.currency || 'EUR', document.documentElement.lang || navigator.language);
  const box = document.createElement('div');
  box.className = 'box';
  box.style.setProperty('--c', COLORS[v.status]);
  box.append(...new DOMParser().parseFromString(TEMPLATE, 'text/html').body.childNodes);
    box.querySelector('.t span').textContent = t(LABEL_KEYS[v.status]);
  box.querySelector('.m').textContent = message(v, fmt, t);
  const svg = sparkline(addPoint(history.map(p => ({ ...p })), info.price), { color: COLORS[v.status] });
  if (svg) box.querySelector('.g').append(new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement);
  box.querySelector('.s').textContent = v.source === 'shop' && !v.days ? t('basedOnShop') : v.days ? t('basedOnDays', [v.days]) : t('basedOn');
  box.querySelector('button').title = t('close');
  box.querySelector('button').setAttribute('aria-label', t('close'));
  box.querySelector('button').onclick = () => host.remove();
  root.appendChild(box);
  document.documentElement.appendChild(host);
}

let lastSig = '';
async function run() {
  const info = extract(document, location.hostname);
  if (!info) return;
  const key = productKey(location.href);
  const sig = key + info.price + info.oldPrice + info.shopLow30;
  if (sig === lastSig) return;
  lastSig = sig;
  const { history } = await api.runtime.sendMessage({ type: 'record', key, info: { ...info, host: location.hostname } });
  render(info, evaluate({ price: info.price, oldPrice: info.oldPrice, oldKind: info.oldKind, shopLow30: info.shopLow30, history }), history);
}

run();

// Answer the popup's "Report a problem" request with what was detected on this page.
api.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg?.type !== 'diagnose') return;
  const info = extract(document, location.hostname);
  send(info && { adapter: info.adapter, price: info.price, oldPrice: info.oldPrice, shopLow30: info.shopLow30 });
});
// Single-page shops change the product without reloading.
let timer; new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(run, 1200); })
  .observe(document.body, { childList: true, subtree: true });
