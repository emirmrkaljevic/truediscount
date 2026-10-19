// English strings, used when the browser i18n API is not available (tests).
export const EN = {
  "extName": "truediscount: is that discount real?",
  "extDescription": "Shows if a shop discount is real by comparing the old price with the lowest price of the last 30 days (EU Omnibus rule).",
  "labelReal": "Real discount",
  "labelInflated": "Inflated discount",
  "labelHigher": "Cheaper recently",
  "labelNodata": "No history yet",
  "labelNodiscount": "Price tracked",
  "msgReal": "Discount looks real: lowest price we saw in 30 days was $1.",
  "msgInflated": "Shop claims -$1%, but we saw $2 in the last 30 days. Real saving: $3%.",
  "msgHigher": "It was cheaper recently: $1 in the last 30 days.",
  "msgNodata": "Shop claims -$1%. No history yet; tracking starts now.",
  "msgLowest": "Lowest price seen in 30 days: $1.",
  "msgTracking": "Tracking this price from today.",
  "msgRrp": "Note: the crossed-out price is the manufacturer's RRP, not an earlier shop price.",
  "basedOnDays": "Based on prices seen in this browser over $1 day(s).",
  "basedOn": "Based on prices seen in this browser.",
  "msgInflatedShop": "Shop claims -$1%, but its own lowest price in the last 30 days was $2. Real saving: $3%.",
  "msgSourceShop": "(The shop itself discloses this 30-day lowest price.)",
  "basedOnShop": "Based on the shop's own 30-day lowest price disclosure.",
  "watchPrompt": "Alert me below",
  "watchSet": "Set",
  "watchRemove": "Remove",
  "watchActive": "Alert below $1",
  "alertTitle": "Price dropped below your target",
  "alertBody": "$1 is now $2 (your target: $3).",
  "close": "Close",
  "popupPrivacy": "Prices are stored only in this browser. Nothing is sent anywhere.",
  "popupEnable": "Enable on this site",
  "popupEnabled": "Enabled on this site",
  "popupAlready": "Already enabled",
  "popupRecent": "Recently tracked",
  "popupEmpty": "No prices tracked yet.",
  "popupLow": "30d low $1",
  "popupReport": "Report a problem",
  "popupReportHint": "Opens a GitHub issue with only the shop's domain and what was detected. You can review it before sending.",
  "popupClear": "Clear all data",
  "popupConfirmClear": "Delete all stored price history?"
};

export function makeT(getMessage) {
  return (key, subs = []) => {
    const m = getMessage?.(key, subs.map(String));
    if (m) return m;
    return (EN[key] ?? key).replace(/\$(\d)/g, (_, i) => subs[i - 1] ?? '');
  };
}
