// js/utils.js
// Robust helper with proxy fallback that handles different proxy response formats.
// For testing only. Proper fix: enable CORS on the Wikibase endpoint.

const Utils = (function () {
  const cfg = window.GENEALOGY_CONFIG || {};
  // Use the "get" endpoint so response is JSON: { contents: "..." }
  const defaultProxyGet = "https://api.allorigins.win/get?url=";

  async function fetchSparqlJson(endpoint, query) {
    const url = endpoint + "?query=" + encodeURIComponent(query);
    const headers = { "Accept": "application/sparql-results+json" };

    // 1) Try direct fetch
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`SPARQL request failed: ${resp.status} ${resp.statusText}\n${text}`);
      }
      // direct response should be JSON
      return await resp.json();
    } catch (err) {
      console.warn("Direct SPARQL fetch failed; trying proxy GET fallback:", err.message);
    }

    // 2) Proxy GET fallback (AllOrigins)
    try {
      const proxy = cfg.corsProxy || defaultProxyGet;
      const proxyUrl = proxy + encodeURIComponent(url);

      const resp2 = await fetch(proxyUrl, { headers: { "Accept": "application/json" }});
      if (!resp2.ok) {
        const text = await resp2.text();
        throw new Error(`Proxy request failed: ${resp2.status} ${resp2.statusText}\n${text}`);
      }

      // api.allorigins.win/get returns JSON like: { "contents": "<raw response body>", ... }
      const wrapper = await resp2.json();
      if (!wrapper || typeof wrapper.contents !== "string") {
        throw new Error("Proxy returned unexpected shape (no 'contents').");
      }

      const raw = wrapper.contents.trim();

      // If raw looks like JSON, parse it; otherwise show the raw for debugging
      try {
        return JSON.parse(raw);
      } catch (parseErr) {
        // raw isn't JSON — show it in the error so you can inspect (it may be HTML)
        throw new Error("Proxy returned a non-JSON body. Raw response starts:\n\n" +
                        raw.slice(0, 1000) + "\n\n(Truncated)\n\n" +
                        "Parsing as JSON failed: " + parseErr.message);
      }

    } catch (proxyErr) {
      // Both direct and proxy failed — give a helpful error
      throw new Error("Both direct fetch and proxy fallback failed:\n" + proxyErr.message);
    }
  }

  function qidFromUrl(url) {
    if (!url) return null;
    const m = url.match(/\/(Q\d+)$/);
    return m ? m[1] : url;
  }

  return { fetchSparqlJson, qidFromUrl };
})();
