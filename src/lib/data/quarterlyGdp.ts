import 'server-only';
import * as XLSX from 'xlsx';
import type { TrendPoint } from '@/components/charts/TrendLineChart';
import { fallbackQuarterlyGdpKpi, type Kpi } from '@/data/kpiData';

// SBP migrated their economic data files from /ecodata/ to /assets/document/
// during their website redesign (2025-26). The old /ecodata/QGDP.xlsx URL now
// returns an HTML SPA shell regardless of the Accept header — the content-type
// and PK magic-byte guards in getQuarterlyGdpKpi() below detect this and fall
// back gracefully. Verified 2026-07-02: /assets/document/QGDP.xlsx serves the
// real xlsx workbook (53.7 KB, Growth_Q sheet identical structure).
const SBP_QGDP_URL = 'https://www.sbp.org.pk/assets/document/QGDP.xlsx';
// SBP publishes quarterly — daily revalidation is more than enough.
const REVALIDATE_SECONDS = 60 * 60 * 24;

// fetch() has no default timeout — without this, a stalled connection hangs
// for undici's ~5 minute default (or blocks `next build` static generation)
// instead of falling into the existing try/catch error handling.
const FETCH_TIMEOUT_MS = 10_000;

// Pakistan FY runs Jul–Jun. Quarter end dates:
// Q1 = Jul–Sep → Sep 30 of FY start year
// Q2 = Oct–Dec → Dec 31 of FY start year
// Q3 = Jan–Mar → Mar 31 of FY end year
// Q4 = Apr–Jun → Jun 30 of FY end year
function quarterEndDate(fyLabel: string, qLabel: string): string {
  // Strip optional "FY " prefix: "FY 2016-17" → "2016-17", "2025-26" stays
  const clean = fyLabel.replace(/^FY\s+/, '');
  const dashIdx = clean.indexOf('-');
  const startYear = parseInt(clean.slice(0, dashIdx), 10);
  const endSuffix = clean.slice(dashIdx + 1);
  const endYear =
    endSuffix.length === 2
      ? Math.floor(startYear / 100) * 100 + parseInt(endSuffix, 10)
      : parseInt(endSuffix, 10);
  switch (qLabel) {
    case 'Q1': return `${startYear}-09-30`;
    case 'Q2': return `${startYear}-12-31`;
    case 'Q3': return `${endYear}-03-31`;
    case 'Q4': return `${endYear}-06-30`;
    default:   throw new Error(`Unknown quarter label: ${qLabel}`);
  }
}

function shortFy(fyLabel: string): string {
  // "FY 2016-17" → "FY17" ; "2025-26" → "FY26"
  const clean = fyLabel.replace(/^FY\s+/, '');
  return `FY${clean.split('-')[1]}`;
}

export interface QuarterlyGdpResult {
  kpi: Kpi;
  trend: TrendPoint[];
  isFallback: boolean;
}

// Snapshot of 19 quarters of official GVA growth (YoY %) used whenever the
// live QGDP.xlsx fetch fails. All values are read directly from the Growth_Q
// sheet of the /assets/document/QGDP.xlsx workbook (captured 2026-07-02).
// The chart's DataQuality badge shows "Fallback" when isFallback=true.
// Update this array — and fallbackQuarterlyGdpKpi in kpiData.ts — whenever
// a new quarter is officially released by SBP/PBS.
const FALLBACK_TREND: TrendPoint[] = [
  { month: 'Q1 FY22', value: 6.40 },  // Jul–Sep 2021 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q2 FY22', value: 4.60 },  // Oct–Dec 2021 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q3 FY22', value: 6.70 },  // Jan–Mar 2022 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q4 FY22', value: 7.02 },  // Apr–Jun 2022 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q1 FY23', value: 1.28 },  // Jul–Sep 2022 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q2 FY23', value: 2.35 },  // Oct–Dec 2022 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q3 FY23', value: -1.22 }, // Jan–Mar 2023 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q4 FY23', value: -3.14 }, // Apr–Jun 2023 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q1 FY24', value: 2.55 },  // Jul–Sep 2023 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q2 FY24', value: 2.03 },  // Oct–Dec 2023 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q3 FY24', value: 2.78 },  // Jan–Mar 2024 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q4 FY24', value: 3.14 },  // Apr–Jun 2024 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q1 FY25', value: 1.60 },  // Jul–Sep 2024 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q2 FY25', value: 2.47 },  // Oct–Dec 2024 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q3 FY25', value: 2.56 },  // Jan–Mar 2025 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q4 FY25', value: 6.14 },  // Apr–Jun 2025 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q1 FY26', value: 3.92 },  // Jul–Sep 2025 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q2 FY26', value: 4.05 },  // Oct–Dec 2025 — SBP QGDP.xlsx 2026-07-02
  { month: 'Q3 FY26', value: 3.99 },  // Jan–Mar 2026 — SBP QGDP.xlsx 2026-07-02
];

function parseWorkbook(buf: ArrayBuffer): QuarterlyGdpResult {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const sheet = wb.Sheets['Growth_Q'];
  if (!sheet) throw new Error('Sheet "Growth_Q" not found in QGDP.xlsx');

  // sheet_to_json with header:1 → rows as arrays (0-indexed rows and cols)
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];

  // Total GVA row: col index 0 = "D." (row 35 = 1-indexed, idx 34 = 0-indexed)
  const gvaRowIdx = rows.findIndex(
    (row) => String(row[0] ?? '').trim() === 'D.',
  );
  if (gvaRowIdx === -1) throw new Error('GVA row (col[0]="D.") not found in Growth_Q');

  // FY labels in row 5 (1-indexed) = idx 4; Q labels in row 6 (1-indexed) = idx 5
  // Data starts at col 2 (0-indexed): "Q1","Q2","Q3","Q4","Q1",...
  const fyRow  = rows[4] as unknown[];
  const qRow   = rows[5] as unknown[];
  const gvaRow = rows[gvaRowIdx] as unknown[];

  const DATA_START_COL = 2;

  const trend: TrendPoint[] = [];
  let currentFy   = '';
  let latestFyFull = '';
  let latestQFull  = '';

  for (let col = DATA_START_COL; col < gvaRow.length; col++) {
    // FY header only present on first col of each fiscal year (merged cell → others null)
    const fyCell = fyRow[col];
    if (fyCell !== undefined && fyCell !== null && String(fyCell).trim() !== '') {
      currentFy = String(fyCell).trim();
    }

    const qLabel = qRow[col] ? String(qRow[col]).trim() : '';
    if (!qLabel.match(/^Q[1-4]$/)) continue;

    const raw = gvaRow[col];
    if (raw === undefined || raw === null || raw === '') continue;

    const value = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (isNaN(value)) continue;

    trend.push({ month: `${qLabel} ${shortFy(currentFy)}`, value: parseFloat(value.toFixed(4)) });
    latestFyFull = currentFy;
    latestQFull  = qLabel;
  }

  if (trend.length === 0) throw new Error('No quarterly GDP data points extracted from QGDP.xlsx');

  const latest   = trend[trend.length - 1];
  const previous = trend.length > 1 ? trend[trend.length - 2] : null;
  const diff     = previous ? latest.value - previous.value : 0;
  const sign     = diff >= 0 ? '+' : '';

  const kpi: Kpi = {
    title:      'Quarterly GDP Growth (YoY)',
    value:      latest.value.toFixed(2),
    unit:       '%',
    change:     previous
                  ? `${sign}${diff.toFixed(2)} pp vs ${previous.month}`
                  : 'no prior data',
    trend:      diff >= 0 ? 'up' : 'down',
    glow:       'blue',
    source:     'SBP / PBS',
    seriesId:   'QGDP.xlsx / Growth_Q / row D.',
    latestDate: quarterEndDate(latestFyFull, latestQFull),
    frequency:  'Quarterly',
  };

  return { kpi, trend, isFallback: false };
}

export async function getQuarterlyGdpKpi(): Promise<QuarterlyGdpResult> {
  try {
    const res = await fetch(SBP_QGDP_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`SBP QGDP fetch returned ${res.status}`);

    // SBP's website now serves an HTML SPA shell for every path, including
    // file download URLs, when the actual file is inaccessible. Detect this
    // before handing the buffer to XLSX.read(), which would throw a cryptic
    // "Invalid signature" error on HTML input rather than a useful one.
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/html')) {
      throw new Error(`SBP QGDP URL returned HTML instead of xlsx (content-type: ${contentType}). The file URL may have changed or requires authentication.`);
    }

    const buf = await res.arrayBuffer();

    // Second guard: verify the xlsx/zip magic bytes (PK = 0x504B) before
    // attempting to parse — a cached HTML response can arrive with the wrong
    // content-type in some CDN/proxy scenarios.
    const firstTwo = new Uint8Array(buf.slice(0, 2));
    if (firstTwo[0] !== 0x50 || firstTwo[1] !== 0x4B) {
      throw new Error('SBP QGDP response is not a valid xlsx file (missing PK magic bytes).');
    }

    const result = parseWorkbook(buf);
    console.log(
      `[QGDP] source=Live SBP — latest=${result.kpi.latestDate} ` +
      `value=${result.kpi.value}% trend-points=${result.trend.length}`,
    );
    return result;
  } catch (err) {
    console.error('[QGDP] source=Fallback (live fetch failed):', err instanceof Error ? err.message : String(err));
    return { kpi: fallbackQuarterlyGdpKpi, trend: FALLBACK_TREND, isFallback: true };
  }
}
