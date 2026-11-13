# truediscount

<p align="center"><a href="https://skintoscan.com/#packages"><img src=".github/assets/skintoscan-support.svg" width="684" alt="Support my open-source work: get a SkinToScan pack"></a><br><sub>If you find this useful, you can support me by getting a SkinToScan pack, my other project. It's a one-time purchase that directly funds my open-source work.</sub></p>
<p align="center"><a href="https://skintoscan.com/checkout/?add-to-cart=138"><img src=".github/assets/skintoscan-pack-1.svg" width="220" alt="Buy Single Picture Check, €4.49"></a> <a href="https://skintoscan.com/checkout/?add-to-cart=139"><img src=".github/assets/skintoscan-pack-5.svg" width="220" alt="Buy 5 Picture Pack, €19.99 (popular)"></a> <a href="https://skintoscan.com/checkout/?add-to-cart=140"><img src=".github/assets/skintoscan-pack-15.svg" width="220" alt="Buy 15 Picture Pack, €54.99"></a></p>

**Is this Black Friday deal real?** truediscount is a free, open-source browser extension for Firefox, Chrome and Edge. On an EU product page it checks the claimed discount against the 30-day lowest price that shops must use under the EU Omnibus rule.

**[Download the latest release](https://github.com/emirmrkaljevic/truediscount/releases/latest)** · [Install](#install) · [Try the live demo](https://emirmrkaljevic.github.io/truediscount/#demo). Free, no account, no data leaves your browser. **[Install for Firefox](https://addons.mozilla.org/en-US/firefox/addon/truediscount/)** from addons.mozilla.org. On Chrome, Edge and other Chromium browsers, load the zip (steps below).

The badge on the product page tells you:

- **Real discount**: the old price matches the 30-day low
- **Inflated discount**: the shop claims -50%, but the product was cheaper recently
- **Cheaper recently**: today's price is higher than the 30-day low

It also keeps a mini price graph, price alerts, a watchlist in the popup, and a local JSON/CSV backup. You can hide the badge on any site from the popup. Many EU shops already print their own "lowest price in the last 30 days". The extension reads that label (English, German, French, Italian, Spanish, Dutch, Polish and more) and can give a verdict on the first visit.

![truediscount on a product page: flags an inflated -50% deal, shows the 30-day price graph and sets a price alert](docs/demo.gif)

## Install

**Firefox:** [Install for Firefox](https://addons.mozilla.org/en-US/firefox/addon/truediscount/) from addons.mozilla.org, one click, updates automatically.

A Chrome Web Store listing is coming later. Until then, Chrome-based browsers load the zip in about a minute, or you can use the userscript.

**Chrome, Edge, Brave, Opera, Vivaldi**
1. Download `truediscount-chrome-<version>.zip` from the [latest release](https://github.com/emirmrkaljevic/truediscount/releases/latest) and unzip it.
2. Open `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`).
3. Turn on **Developer mode** (top right; in Edge it is in the left sidebar).
4. Click **Load unpacked** and select the unzipped folder.
5. Pin the truediscount icon from the puzzle-piece menu and open any product page on a supported shop.

Keep the folder where it is: the browser loads the extension from it. To update, unzip the new version over it and click the reload icon on the extension card.

**Userscript (Tampermonkey, Violentmonkey)**
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [truediscount.user.js](https://github.com/emirmrkaljevic/truediscount/releases/latest/download/truediscount.user.js) from the [latest release](https://github.com/emirmrkaljevic/truediscount/releases/latest) and click Install. It is also on [Greasy Fork](https://greasyfork.org/en/scripts/602599).

Temporary or unsigned Firefox sideloading is described in [Development](docs/development.md).

## Privacy

Local-first. Prices are stored only in your browser (`storage.local`). No account, no analytics, no network requests, no personal data. Clear everything from the popup at any time, or export it to a file you control. Full note: [PRIVACY.md](PRIVACY.md).

## Supported shops

Built-in on Amazon (DE, FR, IT, ES, NL, PL, SE, BE, IE), Zalando (21 countries), MediaMarkt / Saturn / MediaWorld (incl. CH and Italy), Otto, eMAG, Allegro, bol.com, Coolblue, Alternate, Lidl, Notino (25 countries), Euronics (IT), About You (25 EU countries), Morele (PL) and Unieuro (IT). MediaMarkt, MediaWorld, Zalando, Coolblue, Alternate, Lidl, Notino, Euronics Italy, About You, Morele and Unieuro were checked against live product pages in October and November 2026.

Badge missing or wrong? Click **Report a problem** in the popup. It opens a prefilled GitHub issue with just the shop's domain and what was detected, so you can add a product link and submit it.

Any other shop: open the popup and click **Enable on this site**. Works on pages with schema.org `Product` data, Open Graph price tags, strike-through markup, or labelled reference prices such as "statt", "UVP", "van", "przed obniżką" or "PRP".

Full table with test status: [Supported shops](docs/supported-shops.md). The same list is on the [website](https://emirmrkaljevic.github.io/truediscount/supported-shops.html).

## FAQ

**Is it on the Chrome Web Store?**
Not yet. A listing is coming later. Until then, load the Chrome zip from the [latest release](https://github.com/emirmrkaljevic/truediscount/releases/latest) with the steps above, or install the [userscript](https://github.com/emirmrkaljevic/truediscount/releases/latest/download/truediscount.user.js) with Tampermonkey or Violentmonkey, also available on [Greasy Fork](https://greasyfork.org/en/scripts/602599).

**Does a crossed-out RRP count as a 30-day price?**
No. When a shop crosses out the manufacturer's recommended retail price (RRP/UVP) rather than its own earlier price, the badge says so. That comparison is not covered by the 30-day rule.

**Why is there no history the first time I open a product?**
History starts when you first visit. Until then the verdict uses the shop's own 30-day disclosure, when there is one. The verdict is informational and based only on prices seen in your browser; it is not a legal assessment.

The EU rule, limitations, and extra screenshots: [The EU 30-day lowest price rule](docs/omnibus.md).

## License

truediscount is free and open source ([MIT](LICENSE)). The interface is English and German (it follows your browser language; translations welcome in `_locales/`).

Website: https://emirmrkaljevic.github.io/truediscount/

How it works: [Catching fake Black Friday discounts with a 400-line browser extension (and the EU's 30-day rule)](https://dev.to/emirmrkaljevic/catching-fake-black-friday-discounts-with-a-400-line-browser-extension-and-the-eus-30-day-rule-541e) on DEV.

Building from source, adding a shop, and trying a local zip: [Development](docs/development.md).
