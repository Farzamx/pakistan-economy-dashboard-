import 'server-only';
import * as XLSX from 'xlsx';
import type { TrendPoint } from '@/components/charts/TrendLineChart';
import { fallbackQuarterlyGdpKpi, type Kpi } from '@/data/kpiData';

const SBP_QGDP_URL = 'https://www.sbp.org.pk/ecodata/QGDP.xlsx';
// SBP publishes quarterly — daily revalidation is more than enough.
const REVALIDATE_SECONDS = 60 * 60 * 24;

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
}

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

  return { kpi, trend };
}

export async function getQuarterlyGdpKpi(): Promise<QuarterlyGdpResult> {
  try {
    const res = await fetch(SBP_QGDP_URL, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`SBP QGDP fetch returned ${res.status}`);
    const buf = await res.arrayBuffer();
    return parseWorkbook(buf);
  } catch {
    return { kpi: fallbackQuarterlyGdpKpi, trend: [] };
  }
}
