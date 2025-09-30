// js/utils.js
// Small helper functions used by modules.
// - fetchSparqlJson(query) -> returns parsed SPARQL JSON results
// - qidFromUrl(url) -> extracts QID from an entity URL

const Utils = (function () {
  async function fetchSparqlJson(endpoint, query) {
    const url = endpoint + "?query=" + encodeURIComponent(query);
    const headers = { "Accept": "application/sparql-results+json" };
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`SPARQL request failed: ${resp.status} ${resp.statusText}\n${text}`);
    }
    return resp.json();
  }

  function qidFromUrl(url) {
    // e.g. https://masssly.wikibase.cloud/entity/Q150 -> Q150
    if (!url) return null;
    const m = url.match(/\/(Q\d+)$/);
    return m ? m[1] : url;
  }

  return { fetchSparqlJson, qidFromUrl };
})();
