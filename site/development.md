# Development

```sh
npm install
npm test        # unit tests on HTML fixtures
npm run build   # dist/truediscount-chrome-<v>.zip and dist/truediscount-firefox-<v>.zip
```

To try a local build, follow the Chrome or Firefox zip steps in the [README](../README.md#install) with the zips from `dist/`.

Adding a shop: add an adapter to `src/core/extract.js`, its host to `src/hosts.js`, and a fixture test.

Requires Firefox 140 or newer (Firefox for Android 142 or newer).

## Manual Firefox install

Temporary add-ons are removed when Firefox restarts, so the [addons.mozilla.org version](https://addons.mozilla.org/en-US/firefox/addon/truediscount/) is the easier choice.

1. Download `truediscount-firefox-<version>.zip` from the [latest release](https://github.com/emirmrkaljevic/truediscount/releases/latest) (no need to unzip).
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select the zip.

If you want the manual zip to survive a restart, Firefox Developer Edition, Nightly and ESR can keep it installed: set `xpinstall.signatures.required` to `false` in `about:config`, then install the zip from `about:addons` → gear menu → **Install Add-on From File**.

Translations are in `_locales/<lang>/messages.json`. Pull requests for more EU languages are welcome.

Back to the [README](../README.md).
