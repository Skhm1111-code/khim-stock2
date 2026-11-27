(function () {
  const STORAGE_SHELF_MAP = "khim_stock_shelf_map_v1";
  const STORAGE_EXPORT_ITEMS = "khim_stock_export_items_v1";

  const defaultShelfMap = {
    "3V39": "A-02",
    "A39": "B-07",
    "V985": "C-04"
  };

  function loadShelfMap() {
    try {
      const raw = localStorage.getItem(STORAGE_SHELF_MAP);
      return raw ? { ...defaultShelfMap, ...JSON.parse(raw) } : { ...defaultShelfMap };
    } catch (_) {
      return { ...defaultShelfMap };
    }
  }

  function saveShelfMap(map) {
    try {
      localStorage.setItem(STORAGE_SHELF_MAP, JSON.stringify(map));
    } catch (_) {}
  }

  function loadExportItems() {
    try {
      const raw = localStorage.getItem(STORAGE_EXPORT_ITEMS);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveExportItems(list) {
    try {
      localStorage.setItem(STORAGE_EXPORT_ITEMS, JSON.stringify(list));
    } catch (_) {}
  }

  function parseDelimitedText(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const shelfUpdates = {};
    const parsedItems = [];

    lines.forEach((line, idx) => {
      const parts = line.split(/[\t,|;]+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) return;

      const firstUpper = parts[0].toUpperCase();
      if (firstUpper === "CODE" || firstUpper === "ITEM" || firstUpper === "PRODUCT") return;

      const code = parts[0].toUpperCase();
      const second = parts[1] || "ទំនិញ";
      const third = parts[2] || "";
      const fourth = parts[3] || "";

      // Support either (code, shelf) or (code, name/price, qty, shelf)
      if (parts.length === 2 && /^[A-Z0-9]+-[A-Z0-9]+$/i.test(parts[1])) {
        shelfUpdates[code] = parts[1].toUpperCase();
      } else {
        const qtyNum = Number(String(third).replace(/[^0-9.]/g, ""));
        const qty = Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1;
        const shelfHint = /^[A-Z0-9]+-[A-Z0-9]+$/i.test(fourth) ? fourth.toUpperCase() : "";
        if (shelfHint) shelfUpdates[code] = shelfHint;

        parsedItems.push({
          id: "imp-" + idx + "-" + code,
          code,
          name: third && !/^[0-9.]+$/.test(third) ? second + " • " + third : second,
          priceOrNote: third && /^[0-9.]+$/.test(third) ? "$" + third : "",
          qty,
          done: false
        });
      }
    });

    return { shelfUpdates, parsedItems };
  }

  function sortByShelf(list) {
    const shelfMap = loadShelfMap();
    return [...list]
      .map((item) => {
        const codeUpper = String(item.code || "").toUpperCase();
        const shelf = item.shelf || shelfMap[codeUpper] || "UNASSIGNED";
        return { ...item, shelf };
      })
      .sort((a, b) => {
        if (a.shelf === "UNASSIGNED" && b.shelf !== "UNASSIGNED") return 1;
        if (a.shelf !== "UNASSIGNED" && b.shelf === "UNASSIGNED") return -1;
        return String(a.shelf).localeCompare(String(b.shelf), undefined, { numeric: true });
      });
  }

  async function fetchSheetCsv(csvUrl) {
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error("Cannot fetch CSV");
    return await res.text();
  }

  function injectHelperPanel() {
    const appShell = document.querySelector(".app-shell");
    const thumbBar = document.querySelector(".thumb-bar");
    if (!appShell || document.getElementById("syncPanel")) return;

    const panel = document.createElement("section");
    panel.id = "syncPanel";
    panel.className = "summary-card";
    panel.innerHTML = `
      <div class="summary-main">
        <span class="order-label">ភ្ជាប់ Export វីរាជ & Note ក្បាលធ្នើរ</span>
        <button id="toggleSyncBtn" type="button" class="btn-secondary" style="height:36px;padding:0 12px;font-size:13px;">បើក/បិទ</button>
      </div>
      <div id="syncBody" style="display:none;margin-top:10px;flex-direction:column;gap:8px;">
        <input id="sheetCsvInput" type="text" class="order-input" placeholder="ដាក់ Google Sheet CSV Link (បើមាន)" />
        <button id="pullSheetBtn" type="button" class="btn-secondary" style="height:40px;">ទាញទិន្នន័យពី Sheet</button>
        <input id="csvFileInput" type="file" accept=".csv,.txt,.tsv" />
        <textarea id="pasteDataArea" rows="3" class="order-input" style="height:auto;padding:8px 12px;font-size:13px;" placeholder="Paste កូដ/តារាង (ឧ. 3V39, ស្បែកជើង, 1, A-02 ឬ 3V39, A-02)"></textarea>
        <button id="applyPasteBtn" type="button" class="btn-secondary" style="height:40px;">បញ្ចូលទិន្នន័យទៅក្នុង App</button>
        <div id="syncStatus" class="remaining-text">ស្ថានភាព៖ ត្រៀមរួចរាល់សម្រាប់ Update បន្ថែម</div>
      </div>
    `;

    if (thumbBar) {
      appShell.insertBefore(panel, thumbBar);
    } else {
      appShell.appendChild(panel);
    }

    const toggleBtn = document.getElementById("toggleSyncBtn");
    const bodyEl = document.getElementById("syncBody");
    const pullBtn = document.getElementById("pullSheetBtn");
    const csvUrlEl = document.getElementById("sheetCsvInput");
    const fileEl = document.getElementById("csvFileInput");
    const pasteEl = document.getElementById("pasteDataArea");
    const applyBtn = document.getElementById("applyPasteBtn");
    const statusEl = document.getElementById("syncStatus");

    toggleBtn.addEventListener("click", () => {
      const isOpen = bodyEl.style.display === "flex";
      bodyEl.style.display = isOpen ? "none" : "flex";
    });

    function applyParsedText(rawText, sourceLabel) {
      const { shelfUpdates, parsedItems } = parseDelimitedText(rawText);
      const currentMap = loadShelfMap();
      const mergedMap = { ...currentMap, ...shelfUpdates };
      saveShelfMap(mergedMap);

      if (parsedItems.length > 0) {
        saveExportItems(parsedItems);
        window.dispatchEvent(new CustomEvent("khim-stock:items-updated", { detail: parsedItems }));
      } else {
        window.dispatchEvent(new CustomEvent("khim-stock:shelf-updated", { detail: mergedMap }));
      }

      statusEl.textContent =
        "បានបញ្ចូលពី " +
        sourceLabel +
        " (" +
        parsedItems.length +
        " មុខ, " +
        Object.keys(shelfUpdates).length +
        " ក្បាលធ្នើរ)";
    }

    pullBtn.addEventListener("click", async () => {
      const url = csvUrlEl.value.trim();
      if (!url) {
        statusEl.textContent = "សូមដាក់ Google Sheet CSV Link ជាមុនសិន";
        return;
      }
      statusEl.textContent = "កំពុងទាញទិន្នន័យ...";
      try {
        const csvText = await fetchSheetCsv(url);
        applyParsedText(csvText, "Google Sheet");
      } catch (_) {
        statusEl.textContent = "មិនទាន់អាចទាញ Link នេះបានទេ (អាច Update បន្ថែមនៅវគ្គក្រោយ)";
      }
    });

    fileEl.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => applyParsedText(String(reader.result || ""), file.name);
      reader.readAsText(file);
    });

    applyBtn.addEventListener("click", () => {
      const txt = pasteEl.value.trim();
      if (!txt) {
        statusEl.textContent = "សូម Paste ទិន្នន័យមុនចុចបញ្ចូល";
        return;
      }
      applyParsedText(txt, "Paste");
    });
  }

  window.PickSorter = {
    sortByShelf,
    loadShelfMap,
    saveShelfMap,
    loadExportItems,
    parseDelimitedText
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectHelperPanel);
  } else {
    injectHelperPanel();
  }
})();
