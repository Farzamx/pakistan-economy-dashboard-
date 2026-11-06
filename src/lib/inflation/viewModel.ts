// Turns the raw inputs the Inflation page fetches into the plain, serialisable
// structure its client components render.
//
// Pure: no I/O. Every derived number is computed HERE, on the server, from the
// sources — the client components only select, toggle and draw. The model is
// also where the page's data checks run: whenever two sources describe the same
// quantity (published YoY vs YoY derived from the index; the PDF-derived
// category snapshot vs the SDMX-derived group data), the disagreement is
// measured and carried in `checks`, so the methodology section reports what the
// data actually did on this render rather than what we assumed it would do.

import {
  changeSeries,
  contributionsOverLag,
  indexChange,
  otherGroupsIndex,
  type AnnualPoint,
  type ContributionRow,
  type PolicyDecision,
} from "@/lib/inflation/analytics";
import { shiftMonth, toMonthMap, toMonthlyPoints, type MonthKey, type MonthlyPoint } from "@/lib/inflation/periods";
import type { CpiGroupPanel } from "@/lib/inflation/pbsGroups";

export interface RawInflationInputs {
  /** Published national headline CPI, YoY %, by observation date. */
  headline: { date: string; value: number }[] | null;
  /** Urban NFNE core, YoY %. */
  core: { date: string; value: number }[] | null;
  /** Urban Food CPI, YoY %. */
  food: { date: string; value: number }[] | null;
  /** National CPI INDEX level, base 2015-16 = 100. */
  index: { observationDate: string; indexValue: number }[] | null;
  /** SBP policy-rate decisions. */
  policy: PolicyDecision[] | null;
  /** The validated PBS group panel, or null. */
  panel: CpiGroupPanel | null;
  /** Why `panel` is null. */
  panelIssues: string[];
  /** The latest 12-group snapshot already in the database (PDF-derived). */
  snapshot: { observationDate: string; groups: { groupNo: number; weightPct: number; yoyPctChange: number }[] } | null;
  /** World Bank annual CPI inflation by ISO3 country code. */
  intl: { series: Record<string, AnnualPoint[]>; lastUpdated: string | null } | null;
}

export interface GroupModel {
  /** Every month the group INDEX covers (the file’s own range), ascending. */
  indexMonths: MonthKey[];
  /** Fixed 2015-16 basket weights, % . */
  weights: Record<number, number>;
  /** Group YoY % by group number, derived from the group index. */
  yoy: Record<number, MonthlyPoint[]>;
  /** Group MoM %. */
  mom: Record<number, MonthlyPoint[]>;
  /** Group contributions to the headline YoY (percentage points). */
  contribYoY: ContributionRow[];
  /** Group contributions to the headline MoM. */
  contribMoM: ContributionRow[];
  /** YoY of "all groups except Food & Non-Alcoholic Beverages". */
  otherYoY: MonthlyPoint[];
  otherMoM: MonthlyPoint[];
  /** Newest month with a full YoY decomposition. */
  latestMonth: MonthKey;
}

export interface DataCheck {
  id: string;
  /** Human-readable statement of what was compared and what was found. */
  text: string;
  /** "ok" within tolerance, "warn" outside it, "info" for context. */
  status: "ok" | "warn" | "info";
}

export interface InflationViewModel {
  headline: MonthlyPoint[];
  core: MonthlyPoint[];
  food: MonthlyPoint[];
  /** National CPI index level (NOT a rate). */
  index: MonthlyPoint[];
  /** Headline MoM %, DERIVED from `index`. */
  mom: MonthlyPoint[];
  policy: PolicyDecision[];
  /** Latest month of the published headline series: the page's "as of" horizon. */
  horizon: MonthKey | null;
  groups: GroupModel | null;
  panelIssues: string[];
  /** The database's latest category snapshot, kept for the group sections to use when `groups` is unavailable. */
  snapshot: { month: MonthKey; rows: { groupNo: number; weight: number; yoy: number }[] } | null;
  intl: { series: Record<string, AnnualPoint[]>; lastUpdated: string | null } | null;
  checks: DataCheck[];
}

function safePoints(raw: { date: string; value: number }[] | null): MonthlyPoint[] {
  if (!raw) return [];
  try {
    const pts = toMonthlyPoints(raw);
    // A repeated month would silently double-count in every chart; the sources never produce one, so keep the last.
    return [...new Map(pts.map((p) => [p.month, p])).values()];
  } catch {
    return [];
  }
}

function recordBy<T>(nos: number[], fn: (no: number) => T): Record<number, T> {
  return Object.fromEntries(nos.map((n) => [n, fn(n)]));
}

export function buildGroupModel(panel: CpiGroupPanel): GroupModel | null {
  const contribYoY = contributionsOverLag(panel, 12);
  if (contribYoY.length === 0) return null;
  const nos = panel.groups.map((g) => g.groupNo);
  const byNo = new Map(panel.groups.map((g) => [g.groupNo, g]));
  const other = otherGroupsIndex(panel);
  return {
    indexMonths: [...panel.months],
    weights: recordBy(nos, (n) => (byNo.get(n) as { weight: number }).weight),
    yoy: recordBy(nos, (n) => changeSeries((byNo.get(n) as { index: Map<MonthKey, number> }).index, 12, panel.months)),
    mom: recordBy(nos, (n) => changeSeries((byNo.get(n) as { index: Map<MonthKey, number> }).index, 1, panel.months)),
    contribYoY,
    contribMoM: contributionsOverLag(panel, 1),
    otherYoY: changeSeries(other, 12, panel.months),
    otherMoM: changeSeries(other, 1, panel.months),
    latestMonth: contribYoY[contribYoY.length - 1].month,
  };
}

const fmt = (n: number, d = 2) => n.toFixed(d);

/** The measured agreement between the sources, as plain statements. */
function runChecks(model: Pick<InflationViewModel, "headline" | "index" | "snapshot" | "groups">, panel: CpiGroupPanel | null): DataCheck[] {
  const checks: DataCheck[] = [];

  // 1. Published YoY vs YoY derived from the CPI index.
  if (model.index.length > 12 && model.headline.length > 0) {
    const derived = toMonthMap(indexChange(model.index, 12));
    const published = toMonthMap(model.headline);
    let n = 0;
    let max = 0;
    let sum = 0;
    for (const [m, d] of derived) {
      const p = published.get(m);
      if (p === undefined) continue;
      n++;
      const diff = Math.abs(d - p);
      sum += diff;
      max = Math.max(max, diff);
    }
    if (n > 0) {
      checks.push({
        id: "yoy-vs-index",
        // Published YoY is rounded to 1 dp, so differences up to ~0.05 are rounding; up to 0.15 allows the index's own rounding.
        status: max <= 0.15 ? "ok" : "warn",
        text: `Published YoY inflation vs YoY computed from the CPI index: ${n} months compared, mean difference ${fmt(sum / n, 3)} pp, largest ${fmt(max)} pp.`,
      });
    }
  }

  // 2. The two PBS index sources describe the same headline index.
  if (panel && model.index.length > 0) {
    const ledger = toMonthMap(model.index);
    let n = 0;
    let max = 0;
    for (const [m, v] of panel.headlineIndex) {
      const l = ledger.get(m);
      if (l === undefined) continue;
      n++;
      max = Math.max(max, Math.abs(l - v));
    }
    if (n > 0) {
      checks.push({
        id: "index-sources",
        status: max <= 0.05 ? "ok" : "warn",
        text: `CPI index in the database vs the PBS group file: ${n} overlapping months, largest difference ${fmt(max, 3)} index points.`,
      });
    }
  }

  // 3. Contributions add up to the headline change.
  if (model.groups) {
    const rows = model.groups.contribYoY;
    const max = Math.max(...rows.map((r) => Math.abs(r.total - r.headlinePct)));
    checks.push({
      id: "contribution-identity",
      status: max <= 0.02 ? "ok" : "warn",
      text: `Group contributions vs the headline YoY change: ${rows.length} months, the contributions sum to the headline within ${fmt(max, 3)} pp.`,
    });
  }

  // 4. The database's PDF-derived category snapshot vs the SDMX-derived group YoY.
  if (model.snapshot && model.groups) {
    let max = 0;
    let n = 0;
    for (const row of model.snapshot.rows) {
      const series = model.groups.yoy[row.groupNo];
      const match = series?.find((p) => p.month === model.snapshot!.month);
      if (!match) continue;
      n++;
      max = Math.max(max, Math.abs(match.value - row.yoy));
    }
    if (n > 0) {
      checks.push({
        id: "snapshot-vs-sdmx",
        status: max <= 0.05 ? "ok" : "warn",
        text: `Group YoY from PBS's monthly report (PDF) vs derived from PBS's index file: ${n} groups for ${model.snapshot.month}, largest difference ${fmt(max, 3)} pp.`,
      });
    }
  }
  return checks;
}

export function buildInflationViewModel(raw: RawInflationInputs): InflationViewModel {
  const headline = safePoints(raw.headline);
  const core = safePoints(raw.core);
  const food = safePoints(raw.food);
  const index = safePoints(raw.index?.map((r) => ({ date: r.observationDate, value: r.indexValue })) ?? null);
  const groups = raw.panel ? buildGroupModel(raw.panel) : null;

  const snapshot = raw.snapshot
    ? {
        month: raw.snapshot.observationDate.slice(0, 7),
        rows: raw.snapshot.groups.map((g) => ({ groupNo: g.groupNo, weight: g.weightPct, yoy: g.yoyPctChange })),
      }
    : null;

  const partial = { headline, index, snapshot, groups };
  const checks = runChecks(partial, raw.panel);
  if (!raw.panel && raw.panelIssues.length > 0) {
    checks.push({ id: "panel-unavailable", status: "warn", text: `Category history is unavailable: ${raw.panelIssues.join(" ")}` });
  }

  return {
    headline,
    core,
    food,
    index,
    mom: indexChange(index, 1),
    policy: raw.policy ? [...raw.policy].sort((a, b) => a.date.localeCompare(b.date)) : [],
    horizon: headline.length ? headline[headline.length - 1].month : null,
    groups,
    panelIssues: raw.panelIssues,
    snapshot,
    intl: raw.intl,
    checks,
  };
}

/** The month `n` before `month` — re-exported for components that label comparison periods. */
export { shiftMonth };
