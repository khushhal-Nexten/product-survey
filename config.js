// ════════════════════════════════════════════════════════════════
//  config.js  —  Fill in YOUR values before going live
// ════════════════════════════════════════════════════════════════

const CONFIG = {

  // ── PRODUCT SHEET ──────────────────────────────────────────────
  // Your Google Sheet ID that contains product data
  // (from the URL: docs.google.com/spreadsheets/d/THIS_PART/edit)
  PRODUCT_SHEET_ID: "11dBEW2gcpX5Jp51ADi_58C-JsOOxJLRTLLx1tKXLfVk",

  // The tab/sheet name inside that spreadsheet (case-sensitive)
  PRODUCT_SHEET_TAB: "Sheet1",

  // ── COLUMN MAPPING ─────────────────────────────────────────────
  // Tell the app which column contains which data.
  // Use 0-based index (Column A = 0, B = 1, C = 2 …)
  // Or use the exact header name (e.g. "Product Name") — both work.
  COLUMNS: {
    category:     "Category",       // e.g. "Sarees", "Kurtis"
    productName:  "Product Name",
    imageUrl:     "Image URL",
    price:        "Selling Price",
    originalPrice:"Original Price", // optional — leave "" to hide
    description:  "Description",    // optional sub-text under product
  },

  // ── RESPONSE WEBHOOK ───────────────────────────────────────────
  // After deploying your Google Apps Script (Code.gs) as a Web App,
  // paste the generated URL here.
  RESPONSE_WEBHOOK_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec",

  // ── UI OPTIONS ─────────────────────────────────────────────────
  SURVEY_TITLE:    "Product Preference Survey",
  BRAND_NAME:      "Your Brand",

  // Category display order (must match values in the Category column).
  // Leave empty [] to auto-detect from sheet data.
  CATEGORY_ORDER: ["Sarees", "Night Suits", "Kurtis", "Bedsheets"],
};
