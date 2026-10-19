# truediscount

<p align="center"><a href="https://skintoscan.com/#packages"><img src=".github/assets/skintoscan-support.svg" width="684" alt="Support my open-source work: get a SkinToScan pack"></a><br><sub>If you find this useful, you can support me by getting a SkinToScan pack, my other project. It's a one-time purchase that directly funds my open-source work.</sub></p>
<p align="center"><a href="https://skintoscan.com/checkout/?add-to-cart=138"><img src=".github/assets/skintoscan-pack-1.svg" width="220" alt="Buy Single Picture Check, €4.49"></a> <a href="https://skintoscan.com/checkout/?add-to-cart=139"><img src=".github/assets/skintoscan-pack-5.svg" width="220" alt="Buy 5 Picture Pack, €19.99 (popular)"></a> <a href="https://skintoscan.com/checkout/?add-to-cart=140"><img src=".github/assets/skintoscan-pack-15.svg" width="220" alt="Buy 15 Picture Pack, €54.99"></a></p>

**Is that discount real?** A small browser extension for Chrome and Firefox that checks shop discounts against the lowest price of the last 30 days.

Under the EU Omnibus Directive (2019/2161), a shop announcing a price reduction must use the lowest price of the previous 30 days as the reference "old price". Many Black Friday deals don't. truediscount remembers the prices you see while browsing and tells you, right on the product page, whether the claimed discount holds up.

- 🟢 **Real discount**: the old price matches what we saw in the last 30 days
- 🔴 **Inflated discount**: the shop claims -50%, but the product was cheaper a week ago
- 🟠 **Cheaper recently**: today's price is higher than the 30-day low
- Mini price graph for every tracked product
- 🔔 **Price alerts**: set a target price on the badge and get a browser notification when a visit records a price at or below it

![truediscount flags a -50% Black Friday deal that was the same price two weeks earlier](docs/screenshot.png)

### Works on the first visit

Many EU shops already print their own "lowest price in the last 30 days" next to a sale. truediscount reads that disclosure (in English, German, French, Italian, Spanish, Dutch, Polish, Romanian, Czech, Croatian and more) and compares it with the crossed-out price, so you get a verdict before any history has been recorded.

![First visit: the shop's own 30-day low equals today's price, so the -50% is inflated](docs/first-visit.png)

### Price alerts

Click **Alert me below** on the badge (10% under today's price by default, editable). Watched products are listed first in the popup, and the toolbar icon shows how many are at or below their target. Prices are checked whenever you open the product page; the extension never loads shop pages in the background.

## Privacy

Local-first. Prices are stored only in your browser (`storage.local`). No account, no analytics, no network requests, no personal data. Clear everything from the popup at any time.

## Languages

English and German. The extension follows your browser language. Translations are in `_locales/<lang>/messages.json`; pull requests for more EU languages are welcome.

## Supported shops

Built-in (MediaMarkt and Zalando checked against live product pages in October 2026): Amazon (DE, FR, IT, ES, NL, PL, SE, BE), Zalando, MediaMarkt / Saturn, Otto, eMAG, Allegro, bol.com.

Badge missing or wrong? Click **Report a problem** in the popup. It opens a prefilled GitHub issue with just the shop's domain and what was detected, so you can add a product link and submit it.

Any other shop: open the popup and click **Enable on this site**. Works on pages with schema.org `Product` data (JSON-LD, including `StrikethroughPrice` / `ListPrice`), Open Graph price tags, strike-through markup, or labelled reference prices such as "statt", "UVP", "van", "przed obniżką" or "PRP".

## Limitations

When a shop crosses out the manufacturer's recommended retail price (RRP/UVP) rather than its own earlier price, the badge says so: RRP comparisons are not covered by the 30-day rule.

Your own history starts when you first visit a product. Until then the verdict relies on the shop's 30-day disclosure, when there is one. The verdict is informational and based only on prices seen in your browser; it is not a legal assessment.

## Development

```sh
npm install
npm test        # unit tests on HTML fixtures
npm run build   # dist/truediscount-chrome-<v>.zip and dist/truediscount-firefox-<v>.zip
```

Load unpacked: unzip a package and use `chrome://extensions` (Developer mode) or `about:debugging` in Firefox.

Adding a shop: add an adapter to `src/core/extract.js`, its host to `src/hosts.js`, and a fixture test.

## Website

Website: https://emirmrkaljevic.github.io/truediscount/

Read more: [Catching fake Black Friday discounts with a 400-line browser extension (and the EU's 30-day rule)](https://dev.to/emirmrkaljevic/catching-fake-black-friday-discounts-with-a-400-line-browser-extension-and-the-eus-30-day-rule-541e) on DEV.

truediscount is free and open source (MIT). A Pro version with price-drop alerts, longer history and export is planned.
