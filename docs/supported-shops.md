# Supported shops

Where truediscount works out of the box, and how well each shop has been tested. This is the same table as the [website page](supported-shops.html).

| Shop | Countries | Support | Tested against |
| --- | --- | --- | --- |
| Amazon | DE, FR, IT, ES, NL, PL, SE, BE, IE | Built-in, generic fallback | Not yet checked on a live page |
| Zalando | DE, FR, IT, ES, NL, PL, AT, BE, CZ, SK, HU, RO, SI, HR, LT, LV, EE, SE, DK, FI, IE | Built-in | Live product page fixture |
| MediaMarkt / Saturn / MediaWorld | DE, AT, NL, ES, IT (mediaworld.it), BE, PL, HU, SE, CH (Saturn DE, AT) | Built-in, RRP flagged, 30-day label read on first visit | Live product page fixtures (MediaMarkt DE and MediaWorld IT) |
| Coolblue | NL, BE, DE | Built-in, RRP flagged | Live product page fixtures (no live deal yet) |
| Alternate | DE, NL, BE, AT | Built-in, UVP and 30-day popover | Live deal and UVP fixtures |
| Lidl | DE, AT, FR, NL, BE, IT, ES, PL, CZ, SK, HU, RO, BG, HR, SI, PT, IE, DK, SE, FI | Built-in, tells UVP apart from Lidl's own earlier price | Live fixtures from lidl.de and lidl.fr (deal, UVP, no discount); other countries share the same page layout but are not tested yet |
| Notino | DE, AT, CH, FR, BE, NL, IT, ES, PT, PL, CZ, SK, HU, RO, BG, HR, SI, GR, IE, DK, SE, FI, LT, LV, EE | Built-in, reads the selected size's 30-day lowest price | Live product page fixtures from notino.de (special price and voucher price). The same price state was checked on notino.fr |
| Euronics | IT | Built-in, reads the barred previous price as the 30-day lowest price and flags the recommended price | Live product page fixtures from euronics.it (promotion with a previous price, and a recommended price with no 30-day price) |
| About You | DE, AT, FR, BE, NL, LU, IT, ES, PT, PL, CZ, SK, HU, RO, BG, HR, SI, GR, CY, DK, SE, FI, LT, LV, EE | Built-in, reads the 30-day lowest price and flags the original price | Live product page fixtures from aboutyou.de (sale against the 30-day price, and an original price that is not the 30-day price). The same price markup was checked on aboutyou.fr and aboutyou.at |
| Morele | PL | Built-in, reads the 30-day lowest price and keeps the price without a code separate | Live product page fixtures from morele.net (promotion whose barred price is the 30-day low, and a code price with a different 30-day low) |
| Unieuro | IT | Built-in, reads the previous price as the 30-day lowest price and flags the recommended price | Live product page fixtures from unieuro.it (promotion with a previous price, and a recommended price with no 30-day price) |
| Otto | DE | Built-in, generic fallback | Not yet checked on a live page |
| eMAG | RO, HU, BG | Built-in, generic fallback | Not yet checked on a live page |
| Allegro | PL, CZ, SK | Built-in, generic fallback | Not yet checked on a live page |
| bol.com | NL, BE | Built-in, generic fallback | Not yet checked on a live page |
| Any other shop | | One click: Enable on this site | Works with schema.org Product data, strike-through prices or labelled reference prices |

"Live product page fixture" means a saved copy of a real product page is part of the automated tests. "Not yet checked" means the shop is enabled and uses the general detection, but it has not been verified on a real page.

If the badge is missing or wrong, click **Report a problem** in the popup. It opens a prefilled GitHub issue with only the shop's domain and what was detected, so you can add a product link and submit it.

Any other shop: open the popup and click **Enable on this site**. Works on pages with schema.org `Product` data (JSON-LD, including `StrikethroughPrice` / `ListPrice`), Open Graph price tags, strike-through markup, or labelled reference prices such as "statt", "UVP", "van", "przed obniżką" or "PRP".

Built-in shops checked against live product pages in October and November 2026: MediaMarkt, MediaWorld IT, Zalando, Coolblue, Alternate, Lidl, Notino, Euronics Italy, About You, Morele and Unieuro.

Back to the [README](../README.md). Last updated 12 November 2026.
