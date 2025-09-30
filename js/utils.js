// js/utils.js
// Small helper functions used by modules.
// - fetchSparqlJson(endpoint, query) -> returns parsed SPARQL JSON results
// - qidFromUrl(url) -> extracts QID from an entity URL
// This version includes a CORS-proxy fallback for testing only.

const Utils = (function () {
  // Optional config via window.GENEALOGY_CONFIG:
  // window.GENEALOGY_CONFIG = { corsProxy: "https://api.allorigins.win/raw?url=" }
  const cfg = window.GENEALOGY_CONFIG || {};
  const defaultProxy = "https://api.allorigins.win/raw?url="; // testing only

  async function fetchSparqlJson(endpoint, query) {
    const url = endpoint + "?query=" + encodeURIComponent(query);
    const headers = { "Accept": "application/sparql-results+json" };

    // 1) Try direct fetch first (best, avoids proxy)
    try {
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`SPARQL request failed: ${resp.status} ${resp.statusText}\n${text}`);
      }
      return resp.json();
    } catch (err) {
      // 2) Direct fetch failed — likely CORS. Try proxy fallback.
      console.warn("Direct SPARQL fetch failed; trying CORS proxy fallback:", err.message);

      const proxy = cfg.corsProxy || defaultProxy;
      const proxyUrl = proxy + encodeURIComponent(url);

      // api.allorigins returns the raw body (so we try to parse JSON)
      const resp2 = await fetch(proxyUrl, { headers: { "Accept": "application/sparql-results+json" }});
      if (!resp2.ok) {
        const text = await resp2.text();
        throw new Error(`Proxy SPARQL request failed: ${resp2.status} ${resp2.statusText}\n${text}`);
      }
      return resp2.json();
    }
  }

  function qidFromUrl(url) {
    // e.g. https://masssly.wikibase.cloud/entity/Q150 -> Q150
    if (!url) return null;
    const m = url.match(/\/(Q\d+)$/);
    return m ? m[1] : url;
  }

  return { fetchSparqlJson, qidFromUrl };
})();
