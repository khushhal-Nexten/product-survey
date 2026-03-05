// ════════════════════════════════════════════════════════════════
//  app.js  —  Fetch products from Google Sheet → render → submit
// ════════════════════════════════════════════════════════════════

// ── STATE ──────────────────────────────────────────────────────
const selected = new Map(); // id → product object
let allProducts = [];
let categories  = [];

// ── BOOT ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", loadProducts);

// ── 1. FETCH PRODUCTS FROM GOOGLE SHEET ────────────────────────
async function loadProducts() {
  showLoader(true);
  hideError();

  try {
    // Google Sheets JSON feed — sheet must be "Anyone with link can view"
    const sheetId  = CONFIG.PRODUCT_SHEET_ID;
    const tabName  = encodeURIComponent(CONFIG.PRODUCT_SHEET_TAB);
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${tabName}`;

    const res  = await fetch(url);
    const text = await res.text();

    // Google wraps the JSON in  google.visualization.Query.setResponse({…});
    const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)[1]);

    const cols = json.table.cols.map(c => c.label.trim());
    const rows = json.table.rows;

    // Map column labels → indices using CONFIG.COLUMNS
    const idx = buildColIndex(cols);

    allProducts = rows
      .filter(r => r && r.c)
      .map((r, i) => {
        const cell = (key) => {
          const ci = idx[key];
          if (ci === undefined || ci === -1) return "";
          const c = r.c[ci];
          return c && c.v !== null && c.v !== undefined ? String(c.v).trim() : "";
        };
        return {
          id:            `p${i}`,
          category:      cell("category"),
          name:          cell("productName"),
          imageUrl:      cell("imageUrl"),
          price:         cell("price"),
          originalPrice: cell("originalPrice"),
          description:   cell("description"),
        };
      })
      .filter(p => p.name); // skip blank rows

    // Derive category list
    const catSet = new Set(allProducts.map(p => p.category).filter(Boolean));
    if (CONFIG.CATEGORY_ORDER && CONFIG.CATEGORY_ORDER.length > 0) {
      categories = CONFIG.CATEGORY_ORDER.filter(c => catSet.has(c));
      // Append any extra cats not in order list
      catSet.forEach(c => { if (!categories.includes(c)) categories.push(c); });
    } else {
      categories = [...catSet];
    }

    showLoader(false);
    renderProductUI();

  } catch (err) {
    showLoader(false);
    showError("Failed to load products. Make sure the Google Sheet is public (Anyone with link → Viewer). " + err.message);
    console.error(err);
  }
}

// ── Map CONFIG column names → actual column indices ────────────
function buildColIndex(cols) {
  const result = {};
  const cfgCols = CONFIG.COLUMNS;

  for (const [key, nameOrIndex] of Object.entries(cfgCols)) {
    if (nameOrIndex === "" || nameOrIndex === null) { result[key] = -1; continue; }
    if (typeof nameOrIndex === "number") { result[key] = nameOrIndex; continue; }
    // string match (case-insensitive)
    const idx = cols.findIndex(c => c.toLowerCase() === nameOrIndex.toLowerCase());
    result[key] = idx;
  }
  return result;
}

// ── 2. RENDER UI ───────────────────────────────────────────────
function renderProductUI() {
  const ui = document.getElementById("products-ui");
  ui.classList.remove("hidden");

  renderTabs();
  renderPanels();
  activateTab(categories[0]);
}

function renderTabs() {
  const bar = document.getElementById("tabs-bar");
  bar.innerHTML = "";
  categories.forEach(cat => {
    const count = allProducts.filter(p => p.category === cat).length;
    const btn   = document.createElement("button");
    btn.className = "tab-btn";
    btn.dataset.cat = cat;
    btn.innerHTML = `${cat} <span class="tab-count">${count}</span>`;
    btn.onclick = () => activateTab(cat);
    bar.appendChild(btn);
  });
}

function renderPanels() {
  const wrap = document.getElementById("category-panels");
  wrap.innerHTML = "";

  categories.forEach(cat => {
    const products = allProducts.filter(p => p.category === cat);
    const panel = document.createElement("div");
    panel.className = "cat-panel hidden";
    panel.id = `panel-${slugify(cat)}`;

    const grid = document.createElement("div");
    grid.className = "product-grid";

    products.forEach(p => {
      grid.appendChild(buildCard(p));
    });

    panel.appendChild(grid);
    wrap.appendChild(panel);
  });
}

function buildCard(p) {
  const card = document.createElement("div");
  card.className = "product-card";
  card.id = `card-${p.id}`;
  card.onclick = () => toggleSelect(p);

  const priceNum = parseFloat(String(p.price).replace(/[^0-9.]/g, ""));
  const origNum  = parseFloat(String(p.originalPrice).replace(/[^0-9.]/g, ""));
  const hasOrig  = !isNaN(origNum) && origNum > priceNum;
  const discount = hasOrig ? Math.round((1 - priceNum / origNum) * 100) : 0;

  const priceHtml = isNaN(priceNum) ? `<span class="price-label">${p.price}</span>` :
    `<span class="price-label">₹${priceNum.toLocaleString("en-IN")}</span>
     ${hasOrig ? `<span class="price-orig">₹${origNum.toLocaleString("en-IN")}</span>` : ""}
     ${discount > 0 ? `<span class="price-badge">${discount}% off</span>` : ""}`;

  card.innerHTML = `
    <div class="card-check" id="chk-${p.id}">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <div class="card-img-wrap">
      <img src="${p.imageUrl || ''}"
           alt="${p.name}"
           loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
      <div class="img-fallback" style="display:none">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".3">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span>No image</span>
      </div>
    </div>
    <div class="card-body">
      <p class="card-name">${p.name}</p>
      ${p.description ? `<p class="card-desc">${p.description}</p>` : ""}
      <div class="card-price">${priceHtml}</div>
    </div>`;

  return card;
}

// ── 3. SELECTION LOGIC ─────────────────────────────────────────
function toggleSelect(p) {
  if (selected.has(p.id)) {
    selected.delete(p.id);
    document.getElementById(`card-${p.id}`)?.classList.remove("selected");
    document.getElementById(`chk-${p.id}`)?.classList.remove("visible");
  } else {
    selected.set(p.id, p);
    document.getElementById(`card-${p.id}`)?.classList.add("selected");
    document.getElementById(`chk-${p.id}`)?.classList.add("visible");
  }
  updatePill();
}

function clearAll() {
  selected.clear();
  document.querySelectorAll(".product-card.selected").forEach(el => el.classList.remove("selected"));
  document.querySelectorAll(".card-check.visible").forEach(el => el.classList.remove("visible"));
  updatePill();
}

function updatePill() {
  const n = selected.size;
  document.getElementById("sel-count").textContent = `${n} product${n !== 1 ? "s" : ""} selected`;
}

// ── 4. TAB SWITCHING ───────────────────────────────────────────
function activateTab(cat) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
  document.querySelectorAll(".cat-panel").forEach(p => p.classList.add("hidden"));
  const panel = document.getElementById(`panel-${slugify(cat)}`);
  if (panel) panel.classList.remove("hidden");
}

// ── 5. SUBMIT ──────────────────────────────────────────────────
async function submitSurvey() {
  const name  = document.getElementById("f-name").value.trim();
  const email = document.getElementById("f-email").value.trim();
  const dept  = document.getElementById("f-dept").value;
  const notes = document.getElementById("f-notes").value.trim();

  // Validate
  if (!name)  { shake("f-name");  showToast("Please enter your name.", "error"); return; }
  if (!email) { shake("f-email"); showToast("Please enter your email.", "error"); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { shake("f-email"); showToast("Enter a valid email address.", "error"); return; }
  if (!dept)  { shake("f-dept");  showToast("Please select your department.", "error"); return; }
  if (selected.size === 0) { showToast("Please select at least one product.", "error"); return; }

  const products = [...selected.values()];

  // Build per-category summaries
  const byCat = {};
  products.forEach(p => {
    if (!byCat[p.category]) byCat[p.category] = [];
    byCat[p.category].push(p.name);
  });
  const catSummary = Object.entries(byCat).map(([cat, names]) => `${cat}: ${names.join(", ")}`).join(" | ");

  const totalValue = products.reduce((s, p) => {
    const n = parseFloat(String(p.price).replace(/[^0-9.]/g, ""));
    return s + (isNaN(n) ? 0 : n);
  }, 0);

  const payload = {
    timestamp:        new Date().toISOString(),
    name, email,
    department:       dept,
    notes,
    selectedProducts: products.map(p => p.name).join(", "),
    byCategory:       catSummary,
    totalCount:       products.length,
    totalValue:       `₹${totalValue.toLocaleString("en-IN")}`,
    // Individual category columns for easy pivot
    sarees:      (byCat["Sarees"]      || []).join(", "),
    nightSuits:  (byCat["Night Suits"] || []).join(", "),
    kurtis:      (byCat["Kurtis"]      || []).join(", "),
    bedsheets:   (byCat["Bedsheets"]   || []).join(", "),
  };

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-inline"></span> Submitting…`;

  try {
    await fetch(CONFIG.RESPONSE_WEBHOOK_URL, {
      method: "POST",
      mode:   "no-cors",   // Google Apps Script requires no-cors
      headers: { "Content-Type": "application/json" },
      body:   JSON.stringify(payload),
    });

    showToast("🎉 Submitted! Thank you for your preferences.", "success");
    clearAll();
    ["f-name","f-email","f-notes"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("f-dept").value = "";

  } catch (err) {
    showToast("Submission failed. Check your internet connection.", "error");
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Submit Preferences`;
  }
}

// ── HELPERS ────────────────────────────────────────────────────
function showLoader(show) {
  document.getElementById("loader").classList.toggle("hidden", !show);
}
function showError(msg) {
  document.getElementById("error-msg").textContent = msg;
  document.getElementById("error-box").classList.remove("hidden");
}
function hideError() {
  document.getElementById("error-box").classList.add("hidden");
}
function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
function shake(id) {
  const el = document.getElementById(id);
  el.classList.add("shake");
  el.addEventListener("animationend", () => el.classList.remove("shake"), { once: true });
}

let toastTimer;
function showToast(msg, type = "info") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 4500);
}
