(function () {
  const CACHE_KEY = "khim_stock_sheet_cache_v1";
  const URL_KEY = "khim_stock_sheet_url_v1";

  function saveSheetUrl(url) {
    try {
      localStorage.setItem(URL_KEY, String(url || "").trim());
    } catch (_) {}
  }

  function loadSheetUrl() {
    try {
      return localStorage.getItem(URL_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function saveCache(rows) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          updatedAt: new Date().toISOString(),
          rows: Array.isArray(rows) ? rows : []
        })
      );
    } catch (_) {}
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return { updatedAt: null, rows: [] };
      const parsed = JSON.parse(raw);
      return {
        updatedAt: parsed.updatedAt || null,
        rows: Array.isArray(parsed.rows) ? parsed.rows : []
      };
    } catch (_) {
      return { updatedAt: null, rows: [] };
    }
  }

  function parseCsvRows(csvText) {
    const lines = String(csvText || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    const firstCells = lines[0].split(",").map((c) => c.trim().toLowerCase());
    const hasHeader =
      firstCells.includes("code") ||
      firstCells.includes("shelf") ||
      firstCells.includes("qty");

    const startIndex = hasHeader ? 1 : 0;
    const rows = [];

    for (let i = startIndex; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      if (!cols[0]) continue;
      rows.push({
        code: cols[0].toUpperCase(),
        name: cols[1] || "ទំនិញ",
        qty: Number(cols[2]) > 0 ? Number(cols[2]) : 1,
        shelf: (cols[3] || "").toUpperCase()
      });
    }

    return rows;
  }

  async function syncFromSheet(url) {
    const targetUrl = String(url || loadSheetUrl() || "").trim();
    if (!targetUrl) {
      throw new Error("Missing Google Sheet URL");
    }

    const res = await fetch(targetUrl);
    if (!res.ok) {
      throw new Error("Failed to fetch Google Sheet");
    }

    const text = await res.text();
    const rows = parseCsvRows(text);
    saveSheetUrl(targetUrl);
    saveCache(rows);

    return {
      ok: true,
      count: rows.length,
      rows
    };
  }

  window.SheetApi = {
    saveSheetUrl,
    loadSheetUrl,
    saveCache,
    loadCache,
    parseCsvRows,
    syncFromSheet
  };
})();
