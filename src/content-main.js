import { extract, productKey } from './core/extract.js';
import { evaluate, message } from './core/verdict.js';
import { sparkline } from './core/sparkline.js';
import { formatPrice } from './core/price.js';
import { addPoint } from './core/history.js';

const api = globalThis.browser ?? globalThis.chrome;
const COLORS = { real: '#15803d', inflated: '#b91c1c', higher: '#c2410c', nodata: '#475569', nodiscount: '#475569' };
const LABELS = { real: 'Real discount', inflated: 'Inflated discount', higher: 'Cheaper recently', nodata: 'No history yet', nodiscount: 'Price tracked' };

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
  const fmt = x => formatPrice(x, info.currency || 'EUR');
  const box = document.createElement('div');
  box.className = 'box';
  box.style.setProperty('--c', COLORS[v.status]);
  box.append(...new DOMParser().parseFromString(TEMPLATE, 'text/html').body.childNodes);
    box.querySelector('.t span').textContent = LABELS[v.status];
  box.querySelector('.m').textContent = message(v, fmt);
  const svg = sparkline(addPoint(history.map(p => ({ ...p })), info.price), { color: COLORS[v.status] });
  if (svg) box.querySelector('.g').append(new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement);
  box.querySelector('.s').textContent = v.days ? `Based on prices seen in this browser over ${v.days} day(s).` : 'Based on prices seen in this browser.';
  box.querySelector('button').onclick = () => host.remove();
  root.appendChild(box);
  document.documentElement.appendChild(host);
}

let lastSig = '';
async function run() {
  const info = extract(document, location.hostname);
  if (!info) return;
  const key = productKey(location.href);
  const sig = key + info.price + info.oldPrice;
  if (sig === lastSig) return;
  lastSig = sig;
  const { history } = await api.runtime.sendMessage({ type: 'record', key, info: { ...info, host: location.hostname } });
  render(info, evaluate({ price: info.price, oldPrice: info.oldPrice, history }), history);
}

run();
// Single-page shops change the product without reloading.
let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(run, 1200); })
  .observe(document.body, { childList: true, subtree: true });
