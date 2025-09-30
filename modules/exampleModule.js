// modules/exampleModule.js
// Updated to load pre-fetched data from /data/humans.json (produced by GitHub Actions).
// If the data file is missing, shows a friendly message.

(async function ExampleModule() {
  const cfg = (window.GENEALOGY_CONFIG || {});
  const container = document.getElementById("modules");
  if (!container) {
    console.error("exampleModule: #modules element not found in DOM.");
    return;
  }

  const box = document.createElement("div");
  box.className = "module module-example";
  box.innerHTML = `
    <h2>Example: Humans (sample)</h2>
    <p>Showing up to 200 humans from the Wikibase instance (static snapshot).</p>
    <div id="example-module-status" class="status">Loading…</div>
    <div id="example-module-table"></div>
  `;
  container.appendChild(box);

  const statusEl = box.querySelector("#example-module-status");
  const tableWrap = box.querySelector("#example-module-table");

  try {
    statusEl.textContent = "Loading static data from /data/humans.json …";
    const resp = await fetch("/data/humans.json");
    if (!resp.ok) {
      statusEl.textContent = "No static data available yet. The site will populate after the first workflow run.";
      return;
    }
    const data = await resp.json();
    const rows = data.results.bindings;
    if (!rows || rows.length === 0) {
      statusEl.textContent = "No humans found in snapshot.";
      return;
    }
    statusEl.textContent = `Loaded ${rows.length} items (snapshot).`;

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
      const qid = (itemUrl && itemUrl.match(/\/(Q\d+)$/)) ? itemUrl.match(/\/(Q\d+)$/)[1] : (itemUrl || "");
      const label = r.itemLabel ? r.itemLabel.value : qid;
      const dob = r.dob ? r.dob.value : "";
      const imageUrl = r.image ? r.image.value : "";

      const tr = document.createElement("tr");

      const tdItem = document.createElement("td");
      const a = document.createElement("a");
      a.href = itemUrl || "#";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = qid || itemUrl || "(no id)";
      tdItem.appendChild(a);
      tr.appendChild(tdItem);

      const tdLabel = document.createElement("td");
      tdLabel.textContent = label;
      tr.appendChild(tdLabel);

      const tdDob = document.createElement("td");
      tdDob.textContent = dob;
      tr.appendChild(tdDob);

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
  }
})();
