// Phase F.2e-Prep — PROTOTYPE, NOT WIRED INTO THE PAGE.
//
// Assembles the 26 scalar PBS series that live in the observation ledger
// (pbs:cpiIndexNational, pbs:cpiGroupIndex01…12, pbs:cpiGroupWeight01…12, pbs:cpiWeightTotal — written by the F.2b
// adapter) back into the SAME `CpiGroupPanel` the Inflation page's analytics already consume, so nothing downstream
// (buildGroupModel, contributions, waterfall, view model) has to know where the data came from.
//
// THE RULE: all or nothing. A panel is returned only if every check below passes; otherwise `panel` is null and
// `issues` says why. Nothing is zero-filled, interpolated, truncated to a "common window", or mixed with another
// source. Missing observations are carried as null in the aligned grid (so a diagnostic can show exactly where) and
// any null inside the required window rejects the whole ledger read.
//
// The checks deliberately re-state, from the LEDGER'S OWN rows, everything the F.1 file parser and the F.2b adapter
// verified at write time — a stored value is only trusted after it has been re-proved on the way out:
//   presence ........ all 26 series read, none empty, none truncated by the read limit
//   dates ........... every period is a real month-end; no duplicate current row per month
//   alignment ....... all 26 series cover exactly the same consecutive months (a partly-ingested new month is rejected)
//   provenance ...... SDMX id, file URL, quality, unit match what the adapter wrote
//   precision ....... stored numeric == the exact source text recorded beside it (nothing rounded on the way through)
//   base period ..... ONE supported base across all 26 (2015/2016); a rebase is never read as the old basket
//   weights ......... constant, positive, sum 100 ± WEIGHT_SUM_TOLERANCE, and equal to the stored total series
//   index sanity .... 50 < index < 2000 (same bounds as the file parser)
//   Laspeyres ....... Σ w·I / Σ w reproduces the headline index within LASPEYRES_TOLERANCE every month
// Thresholds are imported from pbsGroups.ts, not copied, so the file path and the ledger path can never disagree.
//
// Pure: rows in, structure out. The read itself lives in src/lib/data/cpiGroupLedgerReader.ts.

import { CPI_GROUP_COUNT, LASPEYRES_TOLERANCE, WEIGHT_SUM_TOLERANCE, type CpiGroupPanel, type CpiGroupSeries } from "@/lib/inflation/pbsGroups";
import { isMonthKey, monthIndex, type MonthKey } from "@/lib/inflation/periods";
import { PBS_CPI_FILE_URL, PBS_CPI_SERIES, SUPPORTED_BASE_PERIODS, baseLabel, monthEnd, type PbsSeriesDefinition } from "@/lib/providers/pbsCpiGroupsAdapter";

/** One CURRENT ledger row, in the shape get_canonical_observation_provenance returns (camel-cased). */
export interface LedgerRow {
  /** "YYYY-MM-DD" — the adapter writes month-ends. */
  observationPeriod: string;
  value: number;
  unit: string;
  /** When this row became canonical (ISO). */
  vintage: string;
  releaseDate: string | null;
  /** The file's own Prepared timestamp. */
  sourceUpdatedAt: string | null;
  /** When PEIC wrote it. */
  fetchedAt: string | null;
  qualityStatus: string | null;
  sourceSeriesId: string | null;
  sourceReference: Record<string, unknown> | null;
}

export type LedgerSeriesRead = { ok: true; rows: readonly LedgerRow[]; truncated: boolean } | { ok: false; error: string };
/** indicator key -> what the read of that key produced (undefined = never read). */
export type LedgerReads = Readonly<Record<string, LedgerSeriesRead | undefined>>;

/** Aligned view of one series over the union of months; null = no observation (never zero). Diagnostic. */
export type AlignedGrid = Map<string, Map<MonthKey, number | null>>;

export interface LedgerProvenance {
  source: "ledger";
  basePeriod: string;
  seriesCount: number;
  firstMonth: MonthKey;
  latestMonth: MonthKey;
  monthCount: number;
  /** Min/max of the file's Prepared timestamps over all 1,352+ rows. Several values are normal: new months arrive in later files. */
  sourceUpdatedAt: { min: string | null; max: string | null };
  /** When PEIC last wrote any of these rows (the last data CHANGE; an unchanged ingestion run writes nothing). */
  fetchedAt: { min: string | null; max: string | null };
  vintage: { min: string; max: string };
  dataSetIds: string[];
}

export type LedgerFailureKind = "unavailable" | "invalid";

export interface LedgerPanelResult {
  /** Non-null only when `issues` is empty. */
  panel: CpiGroupPanel | null;
  issues: string[];
  /** "unavailable": the ledger could not be read (or has nothing). "invalid": it was read and failed a data check. Null on success. */
  failureKind: LedgerFailureKind | null;
  provenance: LedgerProvenance | null;
  /** Always built, even on failure, so a monitor can show where the holes are. */
  grid: AlignedGrid;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-31" -> "2026-10" only if it IS the month's last day; otherwise null (the adapter writes nothing else). */
export function monthKeyFromMonthEnd(observationPeriod: string): MonthKey | null {
  const month = observationPeriod.slice(0, 7);
  if (!isMonthKey(month)) return null;
  return monthEnd(month) === observationPeriod ? month : null;
}

function indexUnit(base: string): string {
  return `Index (${baseLabel(base)}=100)`;
}

function expectedUnit(def: PbsSeriesDefinition, base: string): string {
  if (def.kind === "headlineIndex" || def.kind === "groupIndex") return indexUnit(base);
  if (def.kind === "weightTotal") return "% of basket (all groups)";
  return "% of basket";
}

const ISO = (s: string | null) => (s === null ? null : s);
function minMax(values: (string | null)[]): { min: string | null; max: string | null } {
  const v = values.filter((x): x is string => !!x).sort();
  return { min: v.length ? v[0] : null, max: v.length ? v[v.length - 1] : null };
}

function list(items: readonly string[], max = 3): string {
  return items.length <= max ? items.join(", ") : `${items.slice(0, max).join(", ")} … (+${items.length - max} more)`;
}

export function assembleLedgerPanel(reads: LedgerReads): LedgerPanelResult {
  const issues: string[] = [];
  const grid: AlignedGrid = new Map();
  let readFailed = false;
  const unavailable = (msg: string) => { issues.push(msg); readFailed = true; };
  const invalid = (msg: string) => { issues.push(msg); };

  // ── 1. read + per-row checks ────────────────────────────────────────────────
  const rowsByKey = new Map<string, Map<MonthKey, LedgerRow>>();
  const bases = new Set<string>();
  const allRows: LedgerRow[] = [];

  for (const def of PBS_CPI_SERIES) {
    const key = def.indicatorKey;
    const read = reads[key];
    if (!read) { unavailable(`${key}: this series was not read.`); continue; }
    if (!read.ok) { unavailable(`${key}: the ledger read failed (${read.error}).`); continue; }
    if (read.rows.length === 0) { unavailable(`${key}: the ledger holds no observations for this series.`); continue; }
    if (read.truncated) invalid(`${key}: the read reached its row limit, so completeness cannot be shown.`);

    const byMonth = new Map<MonthKey, LedgerRow>();
    const bad = new Map<string, string[]>(); // reason -> months
    const flag = (reason: string, month: string) => { const a = bad.get(reason) ?? []; a.push(month); bad.set(reason, a); };

    for (const row of read.rows) {
      const month = monthKeyFromMonthEnd(row.observationPeriod);
      if (!month) { flag("is not a month-end date", row.observationPeriod); continue; }
      if (byMonth.has(month)) { flag("has more than one current row", month); continue; }
      if (typeof row.value !== "number" || !Number.isFinite(row.value)) { flag("holds a non-finite value", month); continue; }
      const ref = row.sourceReference ?? {};
      const base = typeof ref.basePeriod === "string" ? ref.basePeriod : null;
      if (base === null) flag("records no base period", month);
      else bases.add(base);
      if (row.sourceSeriesId !== def.sdmxIndicator) flag(`has source_series_id "${row.sourceSeriesId}" instead of ${def.sdmxIndicator}`, month);
      if (ref.sdmxIndicator !== def.sdmxIndicator) flag("records a different SDMX indicator in its source reference", month);
      if (ref.file !== PBS_CPI_FILE_URL) flag("does not name the PBS CPI file as its source", month);
      if (row.qualityStatus !== "official") flag(`has quality_status "${row.qualityStatus}" (expected official)`, month);
      if (base !== null && row.unit !== expectedUnit(def, base)) flag(`has unit "${row.unit}" (expected "${expectedUnit(def, base)}")`, month);
      // PRECISION: the exact text PBS published is stored beside the number; they must be the same number.
      const text = typeof ref.sourceValue === "string" ? ref.sourceValue : null;
      if (text === null) flag("records no source value text", month);
      else if (Number(text) !== row.value) flag(`stores ${row.value} but the recorded source text is "${text}"`, month);
      byMonth.set(month, row);
      allRows.push(row);
    }
    for (const [reason, months] of bad) invalid(`${key}: ${months.length} observation(s) ${reason} (${list(months)}).`);
    rowsByKey.set(key, byMonth);
  }

  // A basket mix is the most informative thing to say, so say it before anything else can return early.
  if (bases.size > 1) invalid(`The series record different base periods (${[...bases].sort().join(", ")}); the basket cannot be mixed.`);

  // Nothing further can be proven without all 26 series; report what we found.
  const headlineKey = "pbs:cpiIndexNational";
  const headlineRows = rowsByKey.get(headlineKey);
  if (!headlineRows) return finish(null);

  // ── 2. alignment (nulls, never zeros) ───────────────────────────────────────
  const union = new Set<MonthKey>();
  for (const m of rowsByKey.values()) for (const k of m.keys()) union.add(k);
  const unionMonths = [...union].sort();
  for (const def of PBS_CPI_SERIES) {
    const m = rowsByKey.get(def.indicatorKey);
    if (!m) continue;
    grid.set(def.indicatorKey, new Map(unionMonths.map((mo) => [mo, m.get(mo)?.value ?? null])));
  }
  const months = [...headlineRows.keys()].sort();
  for (const def of PBS_CPI_SERIES) {
    const m = rowsByKey.get(def.indicatorKey);
    if (!m || def.indicatorKey === headlineKey) continue;
    const missing = months.filter((mo) => !m.has(mo));
    const extra = [...m.keys()].filter((mo) => !headlineRows.has(mo)).sort();
    if (missing.length > 0) invalid(`${def.indicatorKey}: missing ${missing.length} month(s) the headline has (${list(missing)}).`);
    if (extra.length > 0) invalid(`${def.indicatorKey}: has ${extra.length} month(s) the headline lacks (${list(extra)}) — a partly updated ledger.`);
  }
  for (let i = 1; i < months.length; i++) {
    if (monthIndex(months[i]) - monthIndex(months[i - 1]) !== 1) invalid(`The headline series has a gap between ${months[i - 1]} and ${months[i]}.`);
  }
  if (rowsByKey.size < PBS_CPI_SERIES.length || issues.length > 0) return finish(null);

  // ── 3. one SUPPORTED base period (that there is only one was established above) ─
  const base = bases.size === 1 ? [...bases][0] : null;
  if (base === null) invalid("No base period is recorded on any observation.");
  else if (!SUPPORTED_BASE_PERIODS.includes(base)) invalid(`Base period ${base} is not supported (supported: ${SUPPORTED_BASE_PERIODS.join(", ")}).`);
  if (issues.length > 0) return finish(null);

  // ── 4. weights ──────────────────────────────────────────────────────────────
  const groups: CpiGroupSeries[] = [];
  for (let no = 1; no <= CPI_GROUP_COUNT; no++) {
    const idxRows = rowsByKey.get(`pbs:cpiGroupIndex${pad(no)}`) as Map<MonthKey, LedgerRow>;
    const wRows = rowsByKey.get(`pbs:cpiGroupWeight${pad(no)}`) as Map<MonthKey, LedgerRow>;
    const wValues = months.map((m) => (wRows.get(m) as LedgerRow).value);
    if (Math.max(...wValues) - Math.min(...wValues) > 1e-6) invalid(`Group ${no}: the weight is not constant over time, so the fixed-weight identity does not apply.`);
    if (!(wValues[0] > 0 && wValues[0] < 100)) invalid(`Group ${no}: weight ${wValues[0]} is outside (0, 100).`);
    const index = new Map<MonthKey, number>();
    for (const m of months) {
      const v = (idxRows.get(m) as LedgerRow).value;
      if (v < 50 || v > 2000) invalid(`Group ${no}: implausible index ${v} in ${m}.`);
      index.set(m, v);
    }
    groups.push({ groupNo: no, weight: wValues[0], index });
  }
  const headlineIndex = new Map<MonthKey, number>();
  for (const m of months) {
    const v = (headlineRows.get(m) as LedgerRow).value;
    if (v < 50 || v > 2000) invalid(`Headline: implausible index ${v} in ${m}.`);
    headlineIndex.set(m, v);
  }
  if (issues.length > 0) return finish(null);

  const weightSum = groups.reduce((s, g) => s + g.weight, 0);
  if (Math.abs(weightSum - 100) > WEIGHT_SUM_TOLERANCE) invalid(`Weights total ${weightSum.toFixed(3)}, not 100.`);
  const totalRows = rowsByKey.get("pbs:cpiWeightTotal") as Map<MonthKey, LedgerRow>;
  for (const m of months) {
    const t = (totalRows.get(m) as LedgerRow).value;
    if (Math.abs(t - 100) > WEIGHT_SUM_TOLERANCE) { invalid(`The stored total-weight series is ${t} in ${m}, not 100.`); break; }
    if (Math.abs(t - weightSum) > WEIGHT_SUM_TOLERANCE) { invalid(`The 12 group weights total ${weightSum.toFixed(3)} but the stored total-weight series says ${t} in ${m}.`); break; }
  }
  if (issues.length > 0) return finish(null);

  // ── 5. the Laspeyres identity, month by month ───────────────────────────────
  let worst = 0;
  let worstMonth = months[0];
  for (const m of months) {
    const aggregate = groups.reduce((s, g) => s + g.weight * (g.index.get(m) as number), 0) / weightSum;
    const err = Math.abs(aggregate - (headlineIndex.get(m) as number));
    if (err > worst) { worst = err; worstMonth = m; }
  }
  if (worst > LASPEYRES_TOLERANCE) {
    invalid(`The group indices do not reproduce the headline index: worst gap ${worst.toFixed(4)} index points in ${worstMonth} (limit ${LASPEYRES_TOLERANCE}).`);
    return finish(null);
  }

  return finish({ months, headlineIndex, groups }, base as string);

  function finish(panel: CpiGroupPanel | null, basePeriod?: string): LedgerPanelResult {
    if (panel === null || issues.length > 0) {
      return { panel: null, issues, failureKind: readFailed ? "unavailable" : "invalid", provenance: null, grid };
    }
    const first = panel.months[0];
    const latest = panel.months[panel.months.length - 1];
    const vintages = allRows.map((r) => r.vintage).sort();
    const ids = new Set<string>();
    for (const r of allRows) if (typeof r.sourceReference?.dataSetId === "string") ids.add(r.sourceReference.dataSetId);
    return {
      panel,
      issues: [],
      failureKind: null,
      grid,
      provenance: {
        source: "ledger",
        basePeriod: basePeriod as string,
        seriesCount: PBS_CPI_SERIES.length,
        firstMonth: first,
        latestMonth: latest,
        monthCount: panel.months.length,
        sourceUpdatedAt: minMax(allRows.map((r) => ISO(r.sourceUpdatedAt))),
        fetchedAt: minMax(allRows.map((r) => ISO(r.fetchedAt))),
        vintage: { min: vintages[0], max: vintages[vintages.length - 1] },
        dataSetIds: [...ids].sort(),
      },
    };
  }
}
