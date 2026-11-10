# Changelog

## 0.13.3 (2026-11-10)

- Runs on Notino in 25 countries (including DE, FR, IT, ES, PL, CZ and CH) and reads the selected size's 30-day lowest price.
- Prices of 1,000 or more are read in full. Values such as 1299,99, 1,599.00 and 1'299.00 were previously cut to their first digits, so crossed-out prices and 30-day labels dropped out of the comparison.

## 0.13.2 (2026-11-05)

- Runs on MediaWorld Italy (mediaworld.it) and MediaMarkt Switzerland, same reader as MediaMarkt.
- Italian "30gg" 30-day labels are recognised; MediaMarkt "lowest in 30 days" marks are no longer treated as a claimed old price.

## 0.13.1 (2026-11-03)

- Watchlist: remove a single product with the new × button instead of clearing everything.
- Watchlist: when more than 50 products match, the popup now shows how many are listed out of the total.

## 0.13.0 (2026-11-01)

- Watchlist: new search box filters saved products by name or shop, ignoring case and accents.
- New warning when a sale follows a price hike 31 to 90 days earlier, which the 30-day rule alone does not catch.
- Runs on more Amazon, Zalando, MediaMarkt, Saturn and Allegro country sites.
- Firefox users can now install from Firefox Add-ons.

## 0.12.0 (2026-10-27)

- truediscount as a userscript for Tampermonkey and Violentmonkey.
