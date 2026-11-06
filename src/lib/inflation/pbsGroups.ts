// PBS CPI by expenditure group, read from PBS's own SDMX file.
//
// SOURCE
// https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml is the file the
// existing monthly sync (syncCpiFromPbs.ts) already downloads. That sync keeps
// only the headline series (PCPI_IX). The same file also carries, for the same
// 52 months, the 12 expenditure-group INDEX series (PCPI_CP_01_IX … _12_IX) and
// each group's basket WEIGHT (PCPI_CP_xx_WT). This module reads those.
//
// WHAT THE DATA IS (verified against the live file when this was written)
//   - Indices are base 2015-16 = 100, one per group, monthly.
//   - Weights are the FIXED 2015-16 basket weights (constant in every month),
//     not drifting current-month shares. PBS's CPI is a Laspeyres index, so the
//     headline index is exactly the weighted mean of the group indices:
//         headline(t) = Σ weight_i × index_i(t) / Σ weight_i
//     The file satisfies this to within 0.008 index points in every month.
//   - That identity is what makes a contribution decomposition EXACT rather than
//     approximate (see contributionsOverLag in analytics.ts). It is therefore
//     CHECKED on every parse. A file that fails the check is rejected outright:
//     the page then says category history is unavailable instead of drawing
//     decompositions that do not add up.
//
// This module is pure (string in, structure out): fetching lives in
// src/lib/data/pbsCpiGroups.ts, so everything here is testable without a network.

import { isMonthKey, type MonthKey } from "@/lib/inflation/periods";

export const CPI_GROUP_COUNT = 12;

/** Largest |Σ w·I / Σ w − headline| (index points) tolerated. The live file's worst month is 0.008. */
export const LASPEYRES_TOLERANCE = 0.05;
/** Weights must total 100 to within this (the live file totals 100.003). */
export const WEIGHT_SUM_TOLERANCE = 0.1;

export interface CpiGroupSeries {
  /** PBS group number, 1–12 (the same numbering as src/lib/personalInflation/cpiGroups.ts). */
  groupNo: number;
  /** Fixed 2015-16 basket weight, % of the basket. */
  weight: number;
  /** Monthly index, base 2015-16 = 100. */
  index: Map<MonthKey, number>;
}

export interface CpiGroupPanel {
  /** Ascending; every series below covers exactly these months. */
  months: MonthKey[];
  /** Overall national CPI index (PCPI_IX). */
  headlineIndex: Map<MonthKey, number>;
  /** Always CPI_GROUP_COUNT entries, ordered by group number. */
  groups: CpiGroupSeries[];
}

export interface ParsedPanel {
  /** Null whenever `issues` is non-empty — a partially valid panel is never returned. */
  panel: CpiGroupPanel | null;
  issues: string[];
}

function attributes(source: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of source.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) out.set(m[1], m[2]);
  return out;
}

/** indicator code -> month -> value, for every <Series> in the file. */
function readSeries(xml: string): Map<string, Map<MonthKey, number>> {
  const out = new Map<string, Map<MonthKey, number>>();
  for (const s of xml.matchAll(/<Series\b([^>]*)>([\s\S]*?)<\/Series>/g)) {
    const indicator = attributes(s[1]).get("INDICATOR");
    if (!indicator) continue;
    const obs = new Map<MonthKey, number>();
    for (const o of s[2].matchAll(/<Obs\b([^>]*?)\/?>/g)) {
      const a = attributes(o[1]);
      const period = a.get("TIME_PERIOD");
      const raw = a.get("OBS_VALUE");
      if (!period || raw === undefined || !isMonthKey(period)) continue;
      const value = Number(raw);
      if (Number.isFinite(value)) obs.set(period, value);
    }
    out.set(indicator, obs);
  }
  return out;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Parse and VALIDATE the PBS SDMX file. Never throws; on any problem returns
 * `panel: null` with every issue found, so callers can degrade honestly.
 */
export function parseCpiGroupPanel(xml: string): ParsedPanel {
  const issues: string[] = [];
  const series = readSeries(xml);

  const headline = series.get("PCPI_IX");
  if (!headline || headline.size === 0) {
    return { panel: null, issues: ["PCPI_IX (headline index) is missing from the file."] };
  }
  const months = [...headline.keys()].sort();

  const groups: CpiGroupSeries[] = [];
  for (let no = 1; no <= CPI_GROUP_COUNT; no++) {
    const index = series.get(`PCPI_CP_${pad2(no)}_IX`);
    const weights = series.get(`PCPI_CP_${pad2(no)}_WT`);
    if (!index || index.size === 0) {
      issues.push(`Group ${no}: index series PCPI_CP_${pad2(no)}_IX is missing.`);
      continue;
    }
    if (!weights || weights.size === 0) {
      issues.push(`Group ${no}: weight series PCPI_CP_${pad2(no)}_WT is missing.`);
      continue;
    }
    const missing = months.filter((m) => !index.has(m));
    if (missing.length > 0 || index.size !== months.length) {
      issues.push(`Group ${no}: index does not cover exactly the headline's ${months.length} months (missing ${missing.length}).`);
    }
    const wValues = [...weights.values()];
    if (Math.max(...wValues) - Math.min(...wValues) > 1e-6) {
      issues.push(`Group ${no}: weight is not constant over time, so the fixed-weight identity does not apply.`);
    }
    if (wValues[0] <= 0) issues.push(`Group ${no}: non-positive weight.`);
    for (const [m, v] of index) {
      if (v < 50 || v > 2000) issues.push(`Group ${no}: implausible index ${v} in ${m}.`);
    }
    groups.push({ groupNo: no, weight: wValues[0], index });
  }
  for (const [m, v] of headline) {
    if (v < 50 || v > 2000) issues.push(`Headline: implausible index ${v} in ${m}.`);
  }
  if (issues.length > 0) return { panel: null, issues };

  const weightSum = groups.reduce((s, g) => s + g.weight, 0);
  if (Math.abs(weightSum - 100) > WEIGHT_SUM_TOLERANCE) {
    issues.push(`Weights total ${weightSum.toFixed(3)}, not 100.`);
  }

  // The Laspeyres identity, month by month.
  let worst = 0;
  let worstMonth = months[0];
  for (const m of months) {
    const aggregate = groups.reduce((s, g) => s + g.weight * (g.index.get(m) as number), 0) / weightSum;
    const err = Math.abs(aggregate - (headline.get(m) as number));
    if (err > worst) {
      worst = err;
      worstMonth = m;
    }
  }
  if (worst > LASPEYRES_TOLERANCE) {
    issues.push(
      `The group indices do not reproduce the headline index: worst gap ${worst.toFixed(4)} index points in ${worstMonth} (limit ${LASPEYRES_TOLERANCE}).`,
    );
  }
  if (issues.length > 0) return { panel: null, issues };

  return { panel: { months, headlineIndex: headline, groups }, issues: [] };
}
