// Classic content script: loads the module entry point.
(async () => {
  const api = globalThis.browser ?? globalThis.chrome;
  try { await import(api.runtime.getURL('src/content-main.js')); }
  catch (e) { console.debug('truediscount: failed to load', e); }
})();
