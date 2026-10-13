# truediscount

**Is that discount real?** A small browser extension for Chrome and Firefox that checks shop discounts against the lowest price of the last 30 days.

Under the EU Omnibus Directive (2019/2161), a shop announcing a price reduction must use the lowest price of the previous 30 days as the reference "old price". Many Black Friday deals don't. truediscount remembers the prices you see while browsing and tells you, right on the product page, whether the claimed discount holds up.

- 🟢 **Real discount**: the old price matches what we saw in the last 30 days
- 🔴 **Inflated discount**: the shop claims -50%, but the product was cheaper a week ago
- 🟠 **Cheaper recently**: today's price is higher than the 30-day low
- Mini price graph for every tracked product

## Privacy

Local-first. Prices are stored only in your browser (`storage.local`). No account, no analytics, no network requests, no personal data. Clear everything from the popup at any time.

## Supported shops

Built-in: Amazon (DE, FR, IT, ES, NL, PL, SE, BE), Zalando, MediaMarkt / Saturn, Otto, eMAG, Allegro, bol.com.

Any other shop: open the popup and click **Enable on this site**. Works on pages with schema.org `Product` data (JSON-LD), Open Graph price tags or common strike-through price markup.

## Limitations

History starts when you first visit a product, so a fresh install has no data yet. The verdict is informational and based only on prices seen in your browser; it is not a legal assessment.

## Development

```sh
npm install
npm test        # unit tests on HTML fixtures
npm run build   # dist/truediscount-chrome-<v>.zip and dist/truediscount-firefox-<v>.zip
```

Load unpacked: unzip a package and use `chrome://extensions` (Developer mode) or `about:debugging` in Firefox.

Adding a shop: add an adapter to `src/core/extract.js`, its host to `src/hosts.js`, and a fixture test.

## Support

truediscount is free and open source (MIT). If it saves you money, consider [GitHub Sponsors](https://github.com/sponsors/emirmrkaljevic). A Pro version with price-drop alerts, longer history and export is planned.
