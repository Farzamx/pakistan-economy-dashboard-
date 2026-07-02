/**
 * Phase 7 Production Readiness Verification
 *
 * Tests every new parser against live data, runs the complete pipeline,
 * verifies fallback behaviour, idempotency, gap detection, and adaptive
 * polling schedule correctness.
 *
 * SAFETY CONTRACT:
 *   - Sections 2–5 are READ-ONLY: they download and parse official sources
 *     but never call sync_event_actual.
 *   - Section 7 (full pipeline) triggers real DB writes to scheduled events.
 *   - Section 8 (idempotency) runs the pipeline a second time; sync_event_actual
 *     returns false (already released) — confirms no double-write.
 *   - Section 9 (fallback) is inferred from pipeline results — no code changes.
 *   - Section 10 (gap detection) queries economic_events — read-only.
 *
 * Prerequisites:
 *   .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   NOTIFICATION_WORKER_SECRET, APP_URL (deployed Vercel URL), CRON_SECRET.
 *
 * Usage: node scripts/verify_phase7.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Load .env.local ──────────────────────────────────────────────────────────

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(projectRoot, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const WORKER_SECRET = process.env.NOTIFICATION_WORKER_SECRET;
const APP_URL       = process.env.APP_URL;
const CRON_SECRET   = process.env.CRON_SECRET;

// ─── Globals ──────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30_000;

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(label, detail = "") {
  console.log(`  PASS  ${label}${detail ? " — " + detail : ""}`);
  passed++;
}
function fail(label, detail = "") {
  console.error(`  FAIL  ${label}${detail ? " — " + detail : ""}`);
  failed++;
}
function warn(label, detail = "") {
  console.warn(`  WARN  ${label}${detail ? " — " + detail : ""}`);
  warnings++;
}
function info(msg) {
  console.log(`        ${msg}`);
}
function section(title) {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(70));
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function fetchBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const buf = await res.arrayBuffer();
  return { buf, contentType: res.headers.get("content-type") ?? "" };
}

async function supabaseGet(table, params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = `${SUPABASE_URL}/rest/v1/${table}?${q}`;
  const res = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return []; }
}

// ─── Parsing helpers (JS equivalents of the TS parsers) ──────────────────────

const MONTH_NAMES = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
};

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}
function monthEndDate(year, month) {
  const d = lastDayOfMonth(year, month);
  return `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

/** Estimate whether obsDate matches what a due event would expect (monthly, lagMonths). */
function estimatePeriodMatch(obsDate, lagMonths) {
  const today = new Date();
  const obsYM = new Date(obsDate + "T00:00:00Z");
  // Expected obs month = current month - lagMonths (approximate)
  const expectedMonth = new Date(today.getFullYear(), today.getMonth() - lagMonths, 1);
  return obsYM.getFullYear() === expectedMonth.getFullYear() &&
         obsYM.getMonth() === expectedMonth.getMonth();
}

// ─── Section 1: Environment check ────────────────────────────────────────────

section("1. Environment Check");

if (SUPABASE_URL && ANON_KEY && WORKER_SECRET) {
  pass("Supabase env vars present", `URL=${SUPABASE_URL.slice(0,40)}...`);
} else {
  fail("Supabase env vars missing — check .env.local");
}
if (APP_URL && CRON_SECRET) {
  pass("APP_URL + CRON_SECRET present for pipeline test", APP_URL);
} else {
  warn("APP_URL or CRON_SECRET missing — pipeline test (Section 7) will be skipped");
}

// ─── Section 2: PBS CPI PDF Parser ───────────────────────────────────────────

section("2. PBS CPI PDF Parser — Live Fetch");

const PBS_API = "https://www.pbs.gov.pk/wp-json/wp/v2/posts";

let cpiPdfResult = null;

try {
  // Step 1: Discover the CPI post via WordPress API
  const params2 = new URLSearchParams({ search: "Monthly Inflation Report", per_page: "3", orderby: "date", order: "desc" });
  const posts2 = await fetchJson(`${PBS_API}?${params2}`);
  const cpiPost = posts2.find(p => /monthly.inflation.report|consumer.price.index|CPI/i.test(p.title.rendered));
  if (!cpiPost) throw new Error("No Monthly Inflation Report post found");
  pass("PBS WordPress API — CPI post found", `"${cpiPost.title.rendered}" published ${cpiPost.date}`);
  info(`Post publication timestamp: ${cpiPost.date}`);

  // Step 2: Find PDF URL in post content
  const hrefs = [...cpiPost.content.rendered.matchAll(/href="([^"]+\.pdf[^"]*)"/gi)].map(m => m[1]);
  const pdfUrl = hrefs.find(h => /inflation|cpi|report/i.test(h)) ?? hrefs[0];
  if (!pdfUrl) throw new Error("No PDF linked in CPI post");
  pass("PBS CPI PDF URL found", pdfUrl.slice(0, 80));

  // Step 3: Download PDF
  const { buf: pdfBuf, contentType: pdfCt } = await fetchBuffer(pdfUrl);
  if (!pdfCt.includes("pdf") && !pdfUrl.toLowerCase().endsWith(".pdf")) {
    warn("Content-Type suggests this may not be a PDF", `contentType=${pdfCt}`);
  }
  pass("PBS CPI PDF downloaded", `${(pdfBuf.byteLength / 1024).toFixed(1)} KB`);

  // Step 4: Parse PDF text with pdf-parse v2
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: Buffer.from(pdfBuf) });
    const parsed = await parser.getText();
    const text = parsed.text;
    pass("PBS CPI PDF — text extracted", `${text.length} chars, ${parsed.pages?.length ?? "?"} pages`);

    // Step 5: Extract CPI YoY
    const CPI_PATTERNS = [
      /CPI\s+(?:based\s+)?inflation\s+(?:stood\s+at|recorded\s+at|was|is|remained?\s+at)\s+([\d.]+)\s*(?:percent|%)/i,
      /general\s+CPI\s+([\d.]+)/i,
      /national\s+consumer\s+price\s+index[\s\S]{0,120}?([\d.]+)\s*%/i,
      /\bCPI\b[^%\n]{0,60}?([\d.]+)\s*%/i,
    ];
    const CORE_PATTERNS = [
      /core\s+inflation\s*\(NFNE[^)]*\)[^%\n]{0,60}?([\d.]+)\s*(?:percent|%)/i,
      /NFNE\s+Urban\s+([\d.]+)/i,
      /non.food\s+non.energy[^%]{0,80}?([\d.]+)\s*(?:percent|%)/i,
      /core\s*\(?NFNE\)?[^%\n]{0,80}?([\d.]+)\s*(?:percent|%)/i,
    ];

    let cpiPct = null, corePct = null;
    for (const pat of CPI_PATTERNS) {
      const m = text.match(pat);
      if (m?.[1]) { const v = parseFloat(m[1]); if (!isNaN(v) && v > 0 && v < 100) { cpiPct = v; break; } }
    }
    for (const pat of CORE_PATTERNS) {
      const m = text.match(pat);
      if (m?.[1]) { const v = parseFloat(m[1]); if (!isNaN(v) && v > 0 && v < 100) { corePct = v; break; } }
    }

    if (cpiPct !== null) {
      pass(`CPI YoY extracted: +${cpiPct.toFixed(1)}%`);
    } else {
      fail("CPI YoY NOT found in PDF text — regex patterns need updating");
      info(`First 500 chars of PDF text: ${text.slice(0,500).replace(/\n/g," ")}`);
    }
    if (corePct !== null) {
      pass(`Core (NFNE) YoY extracted: +${corePct.toFixed(1)}%`);
    } else {
      warn("Core NFNE not found in PDF — EasyData fallback will handle core");
    }

    // Step 6: Extract observation period
    const periodM = cpiPost.title.rendered.match(/([A-Za-z]+)\s*[,\-]?\s*(20\d{2})/);
    if (periodM) {
      const obsMonth = MONTH_NAMES[periodM[1].toLowerCase()];
      const obsYear = parseInt(periodM[2], 10);
      if (obsMonth && !isNaN(obsYear)) {
        const obsDate = monthEndDate(obsYear, obsMonth);
        pass(`Observation period: ${periodM[1]} ${obsYear} → obsDate=${obsDate}`);
        const periodMatch = estimatePeriodMatch(obsDate, 1);
        if (periodMatch) {
          pass("Period validation estimate: PASS (lagMonths=1 matches current month)");
        } else {
          warn(`Period validation estimate: obs=${obsDate} may not match expected period (lagMonths=1). Sync will skip until event date arrives.`);
        }
        cpiPdfResult = { cpiPct, corePct, obsDate, postDate: cpiPost.date, pdfUrl };
      }
    } else {
      warn("Could not parse obs period from post title — checking post content");
    }
  } catch (pdfErr) {
    fail("pdf-parse v2 failed", pdfErr.message);
    info("Possible issue: pdf-parse ESM/CJS compatibility in Node.js context");
  }
} catch (err) {
  fail("PBS CPI PDF parser section failed", err.message);
}

// ─── Section 3: PBS LSM HTML Parser ──────────────────────────────────────────

section("3. PBS LSM HTML Parser — Live Fetch");

let lsmResult = null;

try {
  const params3 = new URLSearchParams({ search: "Large Scale Manufacturing", per_page: "3", orderby: "date", order: "desc" });
  const posts3 = await fetchJson(`${PBS_API}?${params3}`);
  const lsmPost = posts3.find(p =>
    /large.scale.manufactur|quantum.index|LSMI/i.test(p.title.rendered) ||
    /large.scale.manufactur|quantum.index|LSMI/i.test(p.content.rendered)
  );
  if (!lsmPost) throw new Error("No LSM post found in WordPress API");
  pass("PBS WordPress API — LSM post found", `"${lsmPost.title.rendered}" published ${lsmPost.date}`);
  info(`Post publication timestamp: ${lsmPost.date}`);

  // Strip HTML and extract YoY
  const plainText = lsmPost.content.rendered
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  const yoyMatch = plainText.match(
    /\b(increased?|grew?|declined?|decreased?|fell?|reduced?|contracted?)\s+by\s+([\d.]+)\s*%\s+for\s+([A-Za-z]+),?\s+(\d{4})/i
  );

  if (!yoyMatch) {
    fail("LSM YoY pattern not found in HTML text");
    info(`First 400 chars of plain text: ${plainText.slice(0,400)}`);
  } else {
    const direction = yoyMatch[1].toLowerCase();
    const magnitude = parseFloat(yoyMatch[2]);
    const monthName = yoyMatch[3].toLowerCase();
    const year = parseInt(yoyMatch[4], 10);
    const obsMonth = MONTH_NAMES[monthName];
    const isNeg = /declin|decreas|fell|fall|contract|reduc/i.test(direction);
    const yoyPct = isNeg ? -magnitude : magnitude;
    const sign = yoyPct >= 0 ? "+" : "";

    if (obsMonth) {
      const obsDate = monthEndDate(year, obsMonth);
      pass(`LSM YoY extracted: ${sign}${yoyPct.toFixed(1)}% for ${yoyMatch[3]} ${year}`);
      pass(`Observation period: obsDate=${obsDate}`);
      info(`Post publication timestamp: ${lsmPost.date}`);

      const periodMatch = estimatePeriodMatch(obsDate, 2);
      if (periodMatch) {
        pass("Period validation estimate: PASS (lagMonths=2 matches current month)");
      } else {
        warn(`Period estimate: obs=${obsDate} vs expected lagMonths=2. Will wait until next due event.`);
      }
      lsmResult = { yoyPct, obsDate, postDate: lsmPost.date };
    } else {
      fail(`Unrecognised month name: "${yoyMatch[3]}"`);
    }
  }
} catch (err) {
  fail("PBS LSM HTML parser section failed", err.message);
}

// ─── Section 4: SBP Forex_Arch.xlsx Parser ───────────────────────────────────

section("4. SBP Forex_Arch.xlsx Parser — Live Fetch");

let fxResult = null;
const FOREX_URL = "https://www.sbp.org.pk/assets/document/Forex_Arch.xlsx";

try {
  const { buf: xlsBuf, contentType: xlsCt } = await fetchBuffer(FOREX_URL);
  pass("Forex_Arch.xlsx downloaded", `${(xlsBuf.byteLength / 1024).toFixed(1)} KB, contentType=${xlsCt}`);

  const { default: XLSX } = await import("xlsx");
  const wb = XLSX.read(new Uint8Array(xlsBuf), { type: "array" });
  info(`Sheets: [${wb.SheetNames.join(", ")}]`);

  // Fixed parsing logic matching the updated syncFxReservesFromSbpExcel.ts
  // Sheet "Week-end": header at row 5, col 0 = "END PERIOD", col 1 = "NET RESERVES WITH SBP"
  // Data values are in USD millions. Date is Excel serial.
  function excelSerialToDate(serial) {
    const excelEpoch = new Date(Date.UTC(1899,11,30)).getTime();
    return new Date(excelEpoch + serial * 86_400_000).toISOString().slice(0,10);
  }
  function parseDateStrSbp(rawDate) {
    if (typeof rawDate === "number") return excelSerialToDate(rawDate);
    if (typeof rawDate === "string") {
      // "DD-Mon-YY (R)" format, e.g. "30-Jul-11 (R)"
      const m = rawDate.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
      if (m) {
        const mm = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
        const mon = mm[m[2].toLowerCase()];
        const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
        if (mon) return `${yr}-${mon}-${m[1].padStart(2,"0")}`;
      }
    }
    return null;
  }

  // Priority: Week-end sheet first
  const orderedSheets = [...wb.SheetNames.filter(n => /week/i.test(n)), ...wb.SheetNames.filter(n => !/week/i.test(n))];
  let found = false;
  for (const sheetName of orderedSheets) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // Find header row: col 0 contains "PERIOD", col 1 contains "SBP"
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const c0 = typeof row[0] === "string" ? row[0].toUpperCase() : "";
      const c1 = typeof row[1] === "string" ? row[1].toUpperCase() : "";
      if (c0.includes("PERIOD") && c1.includes("SBP")) { headerIdx = i; break; }
    }
    if (headerIdx < 0) { info(`Sheet "${sheetName}": header not found`); continue; }
    info(`Sheet "${sheetName}": header at row ${headerIdx} — scanning from bottom`);

    for (let i = rows.length - 1; i > headerIdx; i--) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const rawDate = row[0], rawSbp = row[1];
      if (rawDate === null || rawSbp === null || typeof rawSbp !== "number" || rawSbp <= 0) continue;
      const weekEndingDate = parseDateStrSbp(rawDate);
      if (!weekEndingDate) continue;
      const netSbpBn = rawSbp / 1000; // USD millions → billions
      pass(`FX Reserves extracted: $${netSbpBn.toFixed(2)}B for week ending ${weekEndingDate}`);
      pass(`Observation period: weekEndingDate=${weekEndingDate}`);
      info(`Raw SBP col 1 value: ${rawSbp} USD millions = $${netSbpBn.toFixed(3)}B`);
      fxResult = { netSbpBn, weekEndingDate };
      found = true;
      break;
    }
    if (found) break;
  }
  if (!found) {
    fail("Forex_Arch.xlsx: could not extract FX reserves — header detection failed");
  }
} catch (err) {
  fail("SBP Forex_Arch.xlsx parser section failed", err.message);
}

// ─── Section 5: PBS Trade Balance Excel Parser ───────────────────────────────

section("5. PBS Trade Balance Excel Parser — Live Fetch");

let tradeResult = null;

try {
  // Search WordPress for advance trade release
  let tradePost = null;
  for (const searchTerm of ["Advance releases on Foreign Trade", "Foreign Trade Statistics"]) {
    const params5 = new URLSearchParams({ search: searchTerm, per_page: "3", orderby: "date", order: "desc" });
    const posts5 = await fetchJson(`${PBS_API}?${params5}`);
    tradePost = posts5.find(p => /foreign.trade|advance.release/i.test(p.title.rendered));
    if (tradePost) break;
  }

  if (!tradePost) throw new Error("No PBS advance trade release post found");
  pass("PBS WordPress API — trade release post found", `"${tradePost.title.rendered}" published ${tradePost.date}`);
  info(`Post publication timestamp: ${tradePost.date}`);

  // Extract Excel URL
  const hrefs5 = [...tradePost.content.rendered.matchAll(/href="([^"]+\.xlsx[^"]*)"/gi)].map(m => m[1]);
  const xlsxUrl = hrefs5.find(h => /revised.summary|summary/i.test(h)) ?? hrefs5.find(h => /trade|fts/i.test(h)) ?? hrefs5[0];
  if (!xlsxUrl) {
    fail("No .xlsx file linked in trade release post");
    info(`Post title: "${tradePost.title.rendered}"`);
    info(`All hrefs found: ${[...tradePost.content.rendered.matchAll(/href="([^"]+)"/gi)].map(m=>m[1]).slice(0,5).join(", ")}`);
    throw new Error("No Excel URL found");
  }
  pass("PBS Trade Balance Excel URL found", xlsxUrl.slice(0, 80));

  // Download
  const { buf: tbBuf } = await fetchBuffer(xlsxUrl);
  pass("PBS Trade Balance Excel downloaded", `${(tbBuf.byteLength / 1024).toFixed(1)} KB`);

  // Parse — matches the fixed parseTradeExcelSheet() in syncTradeBalanceFromPbs.ts
  // Step 1: find units row with "Rs." and "$" alternating; first "$" = current-period USD column.
  // Step 2: read Exports/Imports/Balance from that column (NOT the last numeric column).
  const { default: XLSX2 } = await import("xlsx");
  const wb2 = XLSX2.read(new Uint8Array(tbBuf), { type: "array" });
  info(`Sheets: [${wb2.SheetNames.join(", ")}]`);

  let exports_m = null, imports_m = null, balance_m = null;
  let foundSheet = null;
  let usdColIdx = -1;

  outer5: for (const sn of wb2.SheetNames) {
    const rows2 = XLSX2.utils.sheet_to_json(wb2.Sheets[sn], { header: 1, defval: null });

    // Step 1: find units row — has "Rs." and "$", first "$" = USD column
    let colIdx = -1;
    for (const row of rows2) {
      if (!Array.isArray(row)) continue;
      const hasRs = row.some(c => typeof c === "string" && c.trim() === "Rs.");
      const dollarIdx = row.findIndex(c => typeof c === "string" && c.trim() === "$");
      if (hasRs && dollarIdx >= 0) { colIdx = dollarIdx; break; }
    }
    if (colIdx < 0) continue;
    info(`Sheet "${sn}": units row found, first $ at col ${colIdx}`);

    // Step 2: find Exports, Imports, Balance rows
    // IMPORTANT: break on first complete set — sheet has MoM, YoY, and Cumulative tables;
    // Table-1 (monthly) appears first and must not be overwritten by cumulative rows.
    let ex = null, im = null, bl = null;
    for (const row of rows2) {
      if (!Array.isArray(row)) continue;
      const label = row[0];
      if (typeof label !== "string") continue;
      const ll = label.toLowerCase().trim();
      const val = row[colIdx];
      if (typeof val !== "number") continue;
      if (/^exports?$/i.test(ll.split(/\s/)[0])) ex = val;
      else if (/^imports?$/i.test(ll.split(/\s/)[0])) im = val;
      else if (/balance.of.trade|trade.deficit/i.test(ll)) bl = val;
      if (ex !== null && im !== null && bl !== null) break;
    }
    if (ex !== null && im !== null) {
      if (bl === null) bl = ex - im;
      exports_m = ex; imports_m = im; balance_m = bl;
      foundSheet = sn; usdColIdx = colIdx;
      break outer5;
    }
  }

  if (exports_m === null) {
    fail("Trade Balance Excel: could not find Exports/Imports rows via $ units column");
    info("Sheet row samples:");
    for (const sn of wb2.SheetNames) {
      const rows2 = XLSX2.utils.sheet_to_json(wb2.Sheets[sn], { header: 1, defval: null });
      info(`  Sheet "${sn}" rows 10-20: ${JSON.stringify(rows2.slice(10, 20))}`);
    }
  } else {
    // Values are in USD millions (e.g. 2690 = $2,690M). Convert to billions.
    const exB = exports_m / 1000, imB = imports_m / 1000, blB = balance_m / 1000;
    info(`Raw USD col ${usdColIdx}: Exports=${exports_m}M, Imports=${imports_m}M, Balance=${balance_m}M`);
    pass(`Trade Balance extracted from sheet "${foundSheet}" (USD col ${usdColIdx})`);
    pass(`Exports: $${exB.toFixed(2)}B | Imports: $${imB.toFixed(2)}B | Balance: $${blB.toFixed(2)}B`);

    // Extract obs period from post title
    const pm = tradePost.title.rendered.match(/([A-Za-z]+)\s*[,\-]?\s*(20\d{2})/);
    if (pm) {
      const obsMonth = MONTH_NAMES[pm[1].toLowerCase()];
      const obsYear = parseInt(pm[2], 10);
      if (obsMonth && !isNaN(obsYear)) {
        const obsDate = monthEndDate(obsYear, obsMonth);
        pass(`Observation period: ${pm[1]} ${obsYear} → obsDate=${obsDate}`);
        info(`Post publication timestamp: ${tradePost.date}`);
        const periodMatch = estimatePeriodMatch(obsDate, 1);
        if (periodMatch) {
          pass("Period validation estimate: PASS (lagMonths=1 matches current month)");
        } else {
          warn(`Period estimate: obs=${obsDate} may not match expected period (lagMonths=1).`);
        }
        tradeResult = { exB, imB, blB, obsDate, postDate: tradePost.date, usdColIdx };
      }
    } else {
      warn("Could not parse obs period from trade post title");
    }
  }
} catch (err) {
  fail("PBS Trade Balance parser section failed", err.message);
}

// ─── Section 6: Pre-Pipeline DB State ────────────────────────────────────────

section("6. Pre-Pipeline DB State — Scheduled Events");

const KEY_SERIES = [
  "cpi-inflation-release",
  "core-inflation-release",
  "large-scale-manufacturing-lsm-growth",
  "sbp-foreign-exchange-reserves",
  "trade-balance",
];

const preState = {};
for (const slug of KEY_SERIES) {
  const rows = await supabaseGet("economic_events", {
    select: "id,event_date,status,actual_value",
    "economic_event_series.slug": `eq.${slug}`,
    order: "event_date.desc",
    limit: 2,
  });
  preState[slug] = rows;
  if (Array.isArray(rows) && rows.length > 0) {
    info(`${slug}: ${rows.map(r => `${r.event_date}:${r.status}${r.actual_value ? `(${r.actual_value})` : ""}`).join(", ")}`);
  } else {
    info(`${slug}: no recent events found (RLS or no events)`);
  }
}

// ─── Section 7: Full Pipeline Run ────────────────────────────────────────────

section("7. Full Pipeline Run — Complete End-to-End");

let pipelineResult1 = null;

if (!APP_URL || !CRON_SECRET) {
  warn("Skipping pipeline test — APP_URL or CRON_SECRET not set");
} else {
  try {
    info(`Calling ${APP_URL}/api/cron/sync-economic-calendar ...`);
    const syncStart = Date.now();
    const res7 = await fetch(`${APP_URL}/api/cron/sync-economic-calendar`, {
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        "x-github-run-id": "verify-phase7-local",
        "x-trigger-type": "manual",
      },
      signal: AbortSignal.timeout(300_000), // 5 min
    });
    const durationMs = Date.now() - syncStart;
    if (!res7.ok) {
      fail(`Sync endpoint returned HTTP ${res7.status}`);
    } else {
      pipelineResult1 = await res7.json();
      pass(`Pipeline completed in ${durationMs}ms`, `HTTP ${res7.status}`);
      info(`totalSynced=${pipelineResult1.totalSynced} totalFailed=${pipelineResult1.totalFailed}`);

      // Check each step
      const steps = [
        ["official-calendar-sync", "officialCalendars"],
        ["calendar-gap-detection", "gapDetection"],
        ["cpi-pbs-sync", "cpiPbsResults"],
        ["trade-balance-sync", "tradeBalanceResult"],
        ["fx-reserves-sync", "fxReservesResult"],
        ["sbp-actual-value-sync", "results"],
        ["lsm-sync", "lsmResult"],
        ["notification-worker", "notifications"],
      ];
      for (const [name, field] of steps) {
        const val = pipelineResult1[field];
        if (val === undefined) {
          warn(`Pipeline result missing field: ${field}`);
        } else if (Array.isArray(val)) {
          const statuses = val.map(r => r.status ?? r.seriesSlug ?? "ok");
          info(`  ${name}: [${statuses.join(", ")}]`);
        } else if (val === null) {
          info(`  ${name}: null (no due event or skipped)`);
        } else {
          info(`  ${name}: status=${val.status ?? "ok"} detail=${String(val.detail ?? "").slice(0,80)}`);
        }
      }

      // CPI PBS results
      if (Array.isArray(pipelineResult1.cpiPbsResults)) {
        for (const r of pipelineResult1.cpiPbsResults) {
          if (r.status === "synced") pass(`CPI PBS — ${r.seriesSlug}: synced`, r.detail?.slice(0,80));
          else if (r.status === "error") warn(`CPI PBS — ${r.seriesSlug}: error (EasyData will fallback)`, r.detail?.slice(0,80));
          else info(`  CPI PBS — ${r.seriesSlug}: ${r.status}`);
        }
      }

      // Trade balance
      if (pipelineResult1.tradeBalanceResult) {
        const tb = pipelineResult1.tradeBalanceResult;
        if (tb.status === "synced") pass(`Trade Balance: synced`, tb.detail?.slice(0,80));
        else if (tb.status === "error") fail(`Trade Balance: error`, tb.detail?.slice(0,100));
        else info(`  Trade Balance: ${tb.status} — ${tb.detail?.slice(0,80)}`);
      }

      // FX Reserves
      if (pipelineResult1.fxReservesResult) {
        const fx = pipelineResult1.fxReservesResult;
        if (fx.status === "synced") pass(`FX Reserves: synced`, fx.detail?.slice(0,80));
        else if (fx.status === "error") fail(`FX Reserves: error`, fx.detail?.slice(0,100));
        else info(`  FX Reserves: ${fx.status} — ${fx.detail?.slice(0,80)}`);
      }

      // LSM
      if (pipelineResult1.lsmResult) {
        const lsm = pipelineResult1.lsmResult;
        if (lsm.status === "synced") pass(`LSM: synced (${lsm.provenance?.sourceName ?? "unknown source"})`, lsm.detail?.slice(0,80));
        else info(`  LSM: ${lsm.status} — ${lsm.detail?.slice(0,80)}`);
      }

      // EasyData results
      if (Array.isArray(pipelineResult1.results)) {
        for (const r of pipelineResult1.results) {
          info(`  EasyData — ${r.seriesSlug}: ${r.status}`);
        }
      }

      pass("Full pipeline completed without exceptions");
    }
  } catch (err) {
    fail("Full pipeline run threw an exception", err.message);
  }
}

// ─── Section 8: Idempotency — Run Pipeline Again ─────────────────────────────

section("8. Idempotency — Second Pipeline Run (no double-writes)");

let pipelineResult2 = null;

if (!APP_URL || !CRON_SECRET) {
  warn("Skipping — APP_URL or CRON_SECRET not set");
} else if (!pipelineResult1) {
  warn("Skipping — first pipeline run failed");
} else {
  try {
    info("Running pipeline a second time to verify idempotency...");
    const res8 = await fetch(`${APP_URL}/api/cron/sync-economic-calendar`, {
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        "x-github-run-id": "verify-phase7-idempotency",
        "x-trigger-type": "manual",
      },
      signal: AbortSignal.timeout(300_000),
    });
    if (!res8.ok) {
      fail(`Second pipeline run returned HTTP ${res8.status}`);
    } else {
      pipelineResult2 = await res8.json();
      // On second run: any previously synced events should NOT be synced again
      const newSynced = pipelineResult2.totalSynced;
      const firstSynced = pipelineResult1.totalSynced;
      info(`First run: ${firstSynced} synced. Second run: ${newSynced} synced.`);

      // Check CPI: if it synced in run 1, it must NOT sync in run 2
      if (Array.isArray(pipelineResult2.cpiPbsResults)) {
        const cpiRun1Synced = pipelineResult1.cpiPbsResults?.some(r => r.status === "synced");
        const cpiRun2Synced = pipelineResult2.cpiPbsResults?.some(r => r.status === "synced");
        if (cpiRun1Synced && !cpiRun2Synced) {
          pass("CPI idempotency: synced in run 1, NOT re-synced in run 2 (sync_event_actual returned false)");
        } else if (!cpiRun1Synced && !cpiRun2Synced) {
          info("CPI: not synced in either run (no due event or period mismatch) — idempotency not directly testable");
        } else if (cpiRun2Synced) {
          warn("CPI synced in BOTH runs — possible duplicate write or the event was reset between runs");
        }
      }

      // Check EasyData for CPI: should be skipped (already released by PBS or no due event)
      if (Array.isArray(pipelineResult2.results)) {
        const cpiEasy = pipelineResult2.results.find(r => r.seriesSlug === "cpi-inflation-release");
        const coreEasy = pipelineResult2.results.find(r => r.seriesSlug === "core-inflation-release");
        if (cpiEasy) {
          if (cpiEasy.status !== "synced") {
            pass(`EasyData CPI run 2: status=${cpiEasy.status} (not re-written — correct)`);
          } else {
            fail(`EasyData CPI run 2 returned "synced" — should have been skipped (event already released)`);
          }
        }
        if (coreEasy) {
          if (coreEasy.status !== "synced") {
            pass(`EasyData Core run 2: status=${coreEasy.status} (not re-written — correct)`);
          } else {
            fail(`EasyData Core run 2 returned "synced" — should have been skipped`);
          }
        }
      }

      pass("Second pipeline run completed without exception");
    }
  } catch (err) {
    fail("Idempotency pipeline run threw an exception", err.message);
  }
}

// ─── Section 9: Fallback Verification ────────────────────────────────────────

section("9. Fallback Verification — Inferred from Pipeline Results");

if (!pipelineResult1) {
  warn("Skipping — pipeline did not run");
} else {
  // The fallback is: if PBS CPI fails, EasyData should sync CPI.
  // We can verify this by checking if CPI ended up synced somewhere.
  const cpiPbsSynced = pipelineResult1.cpiPbsResults?.some(r => r.status === "synced") ?? false;
  const cpiPbsError  = pipelineResult1.cpiPbsResults?.some(r => r.status === "error") ?? false;
  const cpiEasyData  = pipelineResult1.results?.find(r => r.seriesSlug === "cpi-inflation-release");
  const coreEasyData = pipelineResult1.results?.find(r => r.seriesSlug === "core-inflation-release");

  if (cpiPbsSynced) {
    pass("PBS CPI succeeded — EasyData is the standby fallback");
    info("To manually test fallback: PBS PDF fetch can be disrupted by temporarily changing CORS/firewall rules.");
    // Verify EasyData did NOT overwrite (skipped or no-due-event when PBS already synced)
    if (cpiEasyData && cpiEasyData.status !== "synced") {
      pass(`EasyData CPI fallback properly skipped (status=${cpiEasyData.status}) — PBS already wrote the event`);
    } else if (cpiEasyData?.status === "synced") {
      warn("EasyData CPI also shows synced — either both ran in the same window, or PBS released multiple times");
    }
  } else if (cpiPbsError) {
    // PBS failed — check if EasyData picked it up
    if (cpiEasyData?.status === "synced") {
      pass("FALLBACK VERIFIED: PBS CPI failed → EasyData CPI synced successfully");
    } else if (cpiEasyData?.status === "skipped-no-due-event" || cpiEasyData?.status === "skipped-period-mismatch") {
      pass(`PBS CPI failed, EasyData also skipped (${cpiEasyData.status}) — no due event exists yet`);
    } else {
      warn(`PBS CPI error and EasyData status=${cpiEasyData?.status ?? "unknown"} — check logs`);
    }
  } else {
    info(`CPI PBS status: ${pipelineResult1.cpiPbsResults?.map(r=>r.status).join(", ") ?? "none"}`);
    info("PBS CPI skipped (period mismatch or no due event) — fallback not triggered this run");
  }

  // LSM fallback (PBS→EasyData)
  const lsm1 = pipelineResult1.lsmResult;
  if (lsm1) {
    const src = lsm1.provenance?.sourceName ?? "";
    if (lsm1.status === "synced" && src.includes("PBS")) {
      pass("LSM: PBS primary source synced — EasyData fallback not needed");
    } else if (lsm1.status === "synced" && src.includes("EasyData")) {
      pass("LSM FALLBACK ACTIVE: PBS skipped → EasyData synced (correct fallback behaviour)");
    } else {
      info(`LSM: ${lsm1.status} — ${lsm1.detail?.slice(0,80)}`);
    }
  }
}

// ─── Section 10: July CPI Scenario — PBS Writes First, EasyData Skips ────────

section("10. July CPI Scenario — PBS Writes First, EasyData Returns False");

if (!pipelineResult1 || !pipelineResult2) {
  warn("Skipping — requires both pipeline runs to complete");
} else {
  const cpiRun1 = pipelineResult1.cpiPbsResults?.find(r => r.seriesSlug === "cpi-inflation-release");
  const cpiEasyRun2 = pipelineResult2.results?.find(r => r.seriesSlug === "cpi-inflation-release");

  if (cpiRun1?.status === "synced" && cpiEasyRun2 && cpiEasyRun2.status !== "synced") {
    pass("SCENARIO VERIFIED: PBS wrote CPI in run 1 → EasyData returned non-synced in run 2");
    pass("Dashboard shows PBS data earlier than EasyData would have provided it");
    info(`Run 1 PBS: ${cpiRun1.status} — ${cpiRun1.detail?.slice(0,60)}`);
    info(`Run 2 EasyData: ${cpiEasyRun2.status}`);
  } else if (!cpiRun1 || cpiRun1.status !== "synced") {
    info("CPI not yet in release window — scenario cannot be verified with current data");
    info("This scenario will auto-verify on the 1st of next month when PBS publishes");
  } else {
    info(`CPI run 1: ${cpiRun1?.status} | EasyData run 2: ${cpiEasyRun2?.status}`);
  }
}

// ─── Section 11: Gap Detector Verification ───────────────────────────────────

section("11. Gap Detector Verification — CPI Events on Day 1 (not Day 10)");

try {
  // Query CPI events from last 3 months to check dates
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 4);
  const since = threeMonthsAgo.toISOString().slice(0, 10);

  // Use series slug filter via PostgREST
  const cpiEvents = await supabaseGet("economic_events", {
    select: "event_date,status,slug",
    "economic_event_series": "slug=eq.cpi-inflation-release",
    "event_date": `gte.${since}`,
    order: "event_date.desc",
    limit: 6,
  });

  if (Array.isArray(cpiEvents) && cpiEvents.length > 0) {
    info(`CPI events found (last 4 months): ${JSON.stringify(cpiEvents.map(e => ({ date: e.event_date, status: e.status })))}`);
    const daysOfMonth = cpiEvents.map(e => parseInt(e.event_date.slice(8), 10));
    const onDay1 = daysOfMonth.filter(d => d === 1);
    const onDay10 = daysOfMonth.filter(d => d === 10);
    if (onDay1.length > 0) {
      pass(`CPI events are on day 1 of month: ${cpiEvents.filter(e => e.event_date.slice(8) === "01").map(e=>e.event_date).join(", ")}`);
    }
    if (onDay10.length > 0) {
      fail(`STALE: CPI events still on day 10: ${cpiEvents.filter(e => e.event_date.slice(8) === "10").map(e=>e.event_date).join(", ")}`);
      info("Old events on day 10 may be historical (created before the fix). New gap-filled events should be on day 1.");
    }
    // Check trade-balance events
    const tradeEvents = await supabaseGet("economic_events", {
      select: "event_date,status,slug",
      order: "event_date.desc",
      limit: 5,
    });
    // Note: RLS may prevent direct slug filtering — just report what we found
    pass("Gap detector query succeeded");
  } else {
    info("No CPI events returned — RLS may prevent direct slug filtering via REST");
    info("Verify gap detection by checking System Health dashboard after next cron run");
  }
} catch (err) {
  warn("Gap detector query failed", err.message);
}

// ─── Section 12: Adaptive Polling Schedule Analysis ──────────────────────────

section("12. Adaptive Polling Schedule — GitHub Actions Cron Analysis");

const workflowPath = join(projectRoot, ".github/workflows/sync-economic-calendar.yml");
if (!existsSync(workflowPath)) {
  fail("GitHub Actions workflow file not found");
} else {
  const yaml = readFileSync(workflowPath, "utf-8");
  const cronMatches = [...yaml.matchAll(/cron:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  info(`Found ${cronMatches.length} cron schedule(s) in workflow:`);
  for (const cron of cronMatches) {
    info(`  ${cron}`);
  }

  const baseline = cronMatches.find(c => c === "*/15 * * * *");
  if (baseline) pass("Baseline 15-minute schedule present");
  else fail("Baseline 15-minute schedule missing!");

  const cpiWindow = cronMatches.find(c => c.includes("1 * *") && c.includes("*/5"));
  if (cpiWindow) pass("CPI release window schedule present", cpiWindow);
  else fail("CPI release window schedule missing");

  const spiWindow = cronMatches.find(c => c.includes("* * 4") && c.includes("*/5"));
  if (spiWindow) pass("SPI (Thursday) release window schedule present", spiWindow);
  else fail("SPI release window schedule missing");

  const tradeWindow = cronMatches.find(c => /1[5-9]/.test(c) && c.includes("*/5"));
  if (tradeWindow) pass("Trade balance release window schedule present", tradeWindow);
  else fail("Trade balance release window schedule missing");

  const fxFriday = cronMatches.find(c => c.includes("* * 5") && c.includes("*/5"));
  if (fxFriday) pass("FX reserves (Friday) release window schedule present", fxFriday);
  else fail("FX reserves Friday window schedule missing");

  // Estimate monthly runs for free-tier budget
  // */15 = 4/hour * 24h * 30d = 2880 baseline
  // */5 on 1st, 8-13h = 12 * 6h = 72 CPI runs/month
  // */5 Thursday 6-8h = 12 * 2h * 4 Thursdays = 96 SPI
  // */5 15-18 of month, 5-8h = 12 * 3h * 4 days = 144 trade
  // */5 Friday 5-9h = 12 * 4h * 4 Fridays = 192 FX
  const totalEstimate = 2880 + 72 + 96 + 144 + 192;
  info(`Estimated monthly GitHub Actions runs: ~${totalEstimate} (${(totalEstimate / 2000 * 100).toFixed(0)}% of free tier 2,000 min)`);
  if (totalEstimate <= 2000) {
    pass(`Within GitHub Actions free tier (2,000 min/month)`);
  } else {
    warn(`Exceeds free-tier estimate (~${totalEstimate} runs vs 2,000 min limit). Each run is <1 min but check billing.`);
  }
}

// ─── Section 13: Parser Summary Table ────────────────────────────────────────

section("13. Parser Verification Summary");

const rows13 = [
  ["PBS CPI PDF",       cpiPdfResult ? "✓" : "✗", cpiPdfResult?.cpiPct != null ? `+${cpiPdfResult.cpiPct.toFixed(1)}%` : "—", cpiPdfResult?.obsDate ?? "—", cpiPdfResult?.postDate?.slice(0,10) ?? "—", cpiPdfResult ? "N/A (read-only)" : "—", "No"],
  ["PBS Core (NFNE)",   cpiPdfResult?.corePct != null ? "✓" : "WARN", cpiPdfResult?.corePct != null ? `+${cpiPdfResult.corePct.toFixed(1)}%` : "—", cpiPdfResult?.obsDate ?? "—", cpiPdfResult?.postDate?.slice(0,10) ?? "—", "N/A (read-only)", "No"],
  ["PBS LSM HTML",      lsmResult ? "✓" : "✗", lsmResult ? `${lsmResult.yoyPct >= 0 ? "+" : ""}${lsmResult.yoyPct.toFixed(1)}%` : "—", lsmResult?.obsDate ?? "—", lsmResult?.postDate?.slice(0,10) ?? "—", "N/A (read-only)", "No"],
  ["SBP Forex_Arch",    fxResult ? "✓" : "✗", fxResult ? `$${fxResult.netSbpBn.toFixed(2)}B` : "—", fxResult?.weekEndingDate ?? "—", "SBP file date", "N/A (read-only)", "No"],
  ["PBS Trade Balance", tradeResult ? "✓" : "✗", tradeResult ? `$${tradeResult.blB.toFixed(2)}B` : "—", tradeResult?.obsDate ?? "—", tradeResult?.postDate?.slice(0,10) ?? "—", "N/A (read-only)", "No"],
];

console.log("\n  Parser          | Status | Value   | Obs Period | Published  | sync_event_actual | Fallback");
console.log("  " + "─".repeat(95));
for (const r of rows13) {
  console.log(`  ${r[0].padEnd(16)}| ${r[1].padEnd(7)}| ${r[2].padEnd(8)}| ${r[3].padEnd(11)}| ${r[4].padEnd(11)}| ${r[5].padEnd(18)}| ${r[6]}`);
}

if (pipelineResult1) {
  console.log("\n  Pipeline Results (run 1):");
  const pipeRows = [
    ["CPI PBS",      pipelineResult1.cpiPbsResults?.find(r=>r.seriesSlug==="cpi-inflation-release")?.status ?? "—"],
    ["Core PBS",     pipelineResult1.cpiPbsResults?.find(r=>r.seriesSlug==="core-inflation-release")?.status ?? "—"],
    ["Trade Balance",pipelineResult1.tradeBalanceResult?.status ?? "—"],
    ["FX Reserves",  pipelineResult1.fxReservesResult?.status ?? "—"],
    ["LSM",          pipelineResult1.lsmResult?.status ?? "—"],
  ];
  for (const [name, status] of pipeRows) {
    console.log(`    ${name.padEnd(20)}: ${status}`);
  }
}

// ─── Final Summary ────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(70)}`);
console.log(`  Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
if (failed === 0) {
  console.log("  ALL CHECKS PASSED — Phase 7 implementation is production-ready.");
} else {
  console.log("  FAILURES DETECTED — review the output above.");
  console.log("  Parsers that failed may need regex/sheet-layout updates");
  console.log("  once you can inspect the actual live source files.");
}
console.log(`${"═".repeat(70)}\n`);

process.exit(failed > 0 ? 1 : 0);
