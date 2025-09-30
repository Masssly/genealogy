// modules/exampleModule.js
// Simple module: fetches humans (instance of P3 = Q4) and renders a table.
// Drop this file in modules/ and index.html will load it (index references modules/*).

(async function ExampleModule() {
  // CONFIG: you can override these from a global config object before scripts run:
  // window.GENEALOGY_CONFIG = { endpoint: "...", humanQid: "Q4", limit: 200 };
  const cfg = (window.GENEALOGY_CONFIG || {});
  const endpoint = cfg.endpoint || "https://masssly.wikibase.cloud/query/sparql";
  const humanQ = cfg.humanQid || "Q4";
  const limit = cfg.limit || 200;

  const container = document.getElementById("modules");
  if (!container) {
    console.error("exampleModule: #modules element not found in DOM.");
    return;
  }

  // Create a module box
  const box = document.createElement("div");
  box.className = "module module-example";
  box.innerHTML = `
    <h2>Example: Humans (sample)</h2>
    <p>Showing up to ${limit} humans from the Wikibase instance.</p>
    <div id="example-module-status" class="status">Loading…</div>
    <div id="example-module-table"></div>
  `;
  container.appendChild(box);

  const statusEl = box.querySelector("#example-module-status");
  const tableWrap = box.querySelector("#example-module-table");

  // SPARQL query: get item, label, optional date of birth (P21), optional image (P1)
  const sparql = `
PREFIX mwd: <https://masssly.wikibase.cloud/entity/>
PREFIX mwdt: <https://masssly.wikibase.cloud/prop/direct/>
SELECT ?item ?itemLabel ?dob ?image WHERE {
  ?item mwdt:P3 mwd:${humanQ} .
  OPTIONAL { ?item mwdt:P21 ?dob. }
  OPTIONAL { ?item mwdt:P1 ?image. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?itemLabel
LIMIT ${limit}
`;

  try {
    statusEl.textContent = "Fetching data…";
    const data = await Utils.fetchSparqlJson(endpoint, sparql);

    const rows = data.results.bindings;
    if (!rows || rows.length === 0) {
      statusEl.textContent = "No humans found (check endpoint or human QID).";
      return;
    }
    statusEl.textContent = `Loaded ${rows.length} items.`;

    // Build table
    const table = document.createElement("table");
    table.className = "example-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Item</th>
          <th>Name</th>
          <th>DOB</th>
          <th>Image</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    rows.forEach(r => {
      const itemUrl = r.item && r.item.value;
      const qid = Utils.qidFromUrl(itemUrl);
      const label = r.itemLabel ? r.itemLabel.value : qid;
      const dob = r.dob ? r.dob.value : "";
      const imageUrl = r.image ? r.image.value : "";

      const tr = document.createElement("tr");

      // clickable item link
      const tdItem = document.createElement("td");
      const a = document.createElement("a");
      a.href = itemUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = qid || itemUrl;
      tdItem.appendChild(a);
      tr.appendChild(tdItem);

      // label
      const tdLabel = document.createElement("td");
      tdLabel.textContent = label;
      tr.appendChild(tdLabel);

      // dob
      const tdDob = document.createElement("td");
      tdDob.textContent = dob;
      tr.appendChild(tdDob);

      // image (thumbnail if present)
      const tdImg = document.createElement("td");
      if (imageUrl) {
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = label;
        img.style.maxWidth = "80px";
        img.style.maxHeight = "60px";
        img.style.objectFit = "cover";
        tdImg.appendChild(img);
      } else {
        tdImg.textContent = "";
      }
      tr.appendChild(tdImg);

      tbody.appendChild(tr);
    });

    tableWrap.appendChild(table);
  } catch (err) {
    console.error("exampleModule error", err);
    statusEl.textContent = "Failed to load data. See console for details.";
    const epre = document.createElement("pre");
    epre.textContent = String(err.message || err);
    box.appendChild(epre);
  }
})();
