// PBS CPI-by-group provider adapter — Phase F.2b.
//
// NOT WIRED INTO PRODUCTION. Nothing imports this except its own script
// (scripts/ingestPbsCpiGroups.ts) and tests, the Inflation page still reads PBS
// live (F.1/F.2a), and the script is DRY-RUN ONLY in this phase: no database
// write is authorized or possible from here.
//
// WHAT IT PREPARES
// 26 scalar series from the one PBS SDMX file (https://www.pbs.gov.pk/wp-content/
// uploads/2020/07/CPI.xml): the national index, the 12 group indices, the 12 group
// weights, and the total-weight series that lets the weights be checked. Keys follow
// the ledger's provider-qualified convention ("sbp:cpiInflation", "fred:fedFunds"):
//
//   pbs:cpiIndexNational        PCPI_IX            index, base 2015-16 = 100
//   pbs:cpiGroupIndex01 … 12    PCPI_CP_NN_IX      index, base 2015-16 = 100
//   pbs:cpiGroupWeight01 … 12   PCPI_CP_NN_WT      % of basket (fixed base-period weight)
//   pbs:cpiWeightTotal          PCPI_WT            % of basket (all groups; must be 100)
//
// Weights, indices, inflation RATES and contributions are different quantities and
// stay different here: only indices and weights are stored (they are what the file
// publishes). YoY, MoM and contributions are derived at read time from them, exactly
// as the F.1 page does, never stored as if they were source observations.
//
// ONE FILE, ALL-OR-NOTHING
// The orchestrator ingests per series, but this source is one file feeding 26 series,
// so a defect in ANY part must stop ALL of it. The adapter is therefore built only
// from a dataset that has passed every check below (`loadPbsCpiDataset` returns null
// otherwise), so a bad file cannot reach a single write. There is no way to construct
// the adapter from unvalidated data.
//
// VALIDATION (every check is reported; any failure rejects the whole file)
//   structure    all 26 expected series present, none twice
//   periods      valid YYYY-MM, no duplicates, no gaps, identical across all 26 series
//   values       finite numbers only (never coerced, never defaulted to zero)
//   base period  on the allow-list, identical across the 13 index series
//   attributes   monthly, Pakistan, CPI domain
//   weights      total 100 ± 0.1 every month, each weight constant over time
//   identity     Σ w·I / Σ w reproduces the headline index (the F.1 gate, reused as-is)
//   header       Prepared timestamp valid if present
//
// The F.1 parser (src/lib/inflation/pbsGroups.ts) is reused, not reimplemented, for
// the weight/identity gate, so the page and the ledger can never disagree about what a
// valid file is. It is called AFTER this module's stricter structural checks because it
// deliberately tolerates things this phase must reject (a duplicated period collapses
// silently in its Map; a gap in every series is invisible to it).
//
// PROVENANCE (migration 0051's columns, only what the file genuinely exposes)
//   source_updated_at  the file header's own <Prepared> timestamp
//   source_series_id   the SDMX INDICATOR code
//   release_date       null: the file exposes none and one is never inferred
//   quality_status     "official"
//   source_reference   file URL, DataSetID, BASE_PER, methodology, the value exactly as
//                      the file wrote it (no secrets: the file is public)

import { monthIndex, type MonthKey } from "@/lib/inflation/periods";
import { LASPEYRES_TOLERANCE, WEIGHT_SUM_TOLERANCE, parseCpiGroupPanel } from "@/lib/inflation/pbsGroups";
import type { NormalizedObservation, ProviderAdapter } from "./providerAdapter";
import { PBS_CPI_INDICATOR_KEYS, PBS_CPI_SERIES, PBS_SDMX_PROVIDER_ID, type PbsSeriesDefinition, type PbsSeriesKind } from "./pbsCpiSeries";

// The 26-series definitions live in pbsCpiSeries.ts (Phase F.2f: so the freshness registry and the ingestion monitor can
// name the keys without importing this adapter). Re-exported unchanged: every existing import of these names keeps working.
export { PBS_CPI_INDICATOR_KEYS, PBS_CPI_SERIES, PBS_SDMX_PROVIDER_ID };
export type { PbsSeriesDefinition, PbsSeriesKind };

export const PBS_CPI_FILE_URL = "https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml";

/**
 * Base periods this adapter is certified for. A different base period means a new
 * basket and new weights: it is rejected until a person decides how to onboard it.
 */
export const SUPPORTED_BASE_PERIODS: readonly string[] = ["2015/2016"];


// ───────────────────────────── report types ─────────────────────────────

export interface ValidationCheck {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

export interface ValidationReport {
  /** True only if no check failed. Warnings do not fail the file. */
  ok: boolean;
  checks: ValidationCheck[];
}

export interface PbsSeriesPoint {
  month: MonthKey;
  value: number;
  /** The value exactly as the file wrote it. */
  sourceText: string;
}

export interface PbsCpiDataset {
  fileUrl: string;
  dataSetId: string | null;
  /** The header's <Prepared> timestamp as an ISO string, or null if the file has none. */
  preparedAt: string | null;
  /** The publisher the header declares (informational). */
  declaredSource: string | null;
  basePeriod: string;
  /** Ascending, consecutive, identical for every series. */
  months: MonthKey[];
  series: ReadonlyMap<string, { definition: PbsSeriesDefinition; points: readonly PbsSeriesPoint[] }>;
}

export interface LoadResult {
  /** Null whenever `report.ok` is false: a partially valid dataset is never returned. */
  dataset: PbsCpiDataset | null;
  report: ValidationReport;
}

// ───────────────────────────── raw reading ─────────────────────────────

interface RawSeries {
  indicator: string;
  attrs: Map<string, string>;
  obs: { period: string; raw: string }[];
}

function attributes(source: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of source.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) out.set(m[1], m[2]);
  return out;
}

function readRaw(xml: string): { series: RawSeries[]; headerPrepared: string | null; dataSetId: string | null; declaredSource: string | null } {
  const series: RawSeries[] = [];
  for (const s of xml.matchAll(/<Series\b([^>]*)>([\s\S]*?)<\/Series>/g)) {
    const attrs = attributes(s[1]);
    const obs: RawSeries["obs"] = [];
    for (const o of s[2].matchAll(/<Obs\b([^>]*?)\/?>/g)) {
      const a = attributes(o[1]);
      obs.push({ period: a.get("TIME_PERIOD") ?? "", raw: a.get("OBS_VALUE") ?? "" });
    }
    series.push({ indicator: attrs.get("INDICATOR") ?? "", attrs, obs });
  }
  const header = /<(?:\w+:)?Header>([\s\S]*?)<\/(?:\w+:)?Header>/.exec(xml)?.[1] ?? "";
  const tag = (name: string) => new RegExp(`<(?:\\w+:)?${name}[^>]*>([^<]*)</(?:\\w+:)?${name}>`).exec(header)?.[1]?.trim() || null;
  return { series, headerPrepared: tag("Prepared"), dataSetId: tag("DataSetID"), declaredSource: tag("Source") };
}

const NUMERIC = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "2026-10" -> "2026-10-31". */
export function monthEnd(month: MonthKey): string {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
}

/** "2015/2016" -> "2015-16" (how the rest of PEIC writes this base). */
export function baseLabel(basePeriod: string): string {
  const m = /^(\d{4})\/(\d{4})$/.exec(basePeriod);
  return m ? `${m[1]}-${m[2].slice(2)}` : basePeriod;
}

// ───────────────────────────── validation ─────────────────────────────

const pass = (id: string, label: string, detail: string): ValidationCheck => ({ id, label, status: "pass", detail });
const fail = (id: string, label: string, detail: string): ValidationCheck => ({ id, label, status: "fail", detail });
const warn = (id: string, label: string, detail: string): ValidationCheck => ({ id, label, status: "warn", detail });
const list = (items: readonly string[], max = 5) => (items.length <= max ? items.join("; ") : `${items.slice(0, max).join("; ")}; …and ${items.length - max} more`);

/**
 * Parse and validate the PBS file. Returns a dataset ONLY if every check passes;
 * otherwise `dataset` is null and the report says exactly what failed. Never throws.
 */
export function loadPbsCpiDataset(xml: string, fileUrl: string = PBS_CPI_FILE_URL): LoadResult {
  const checks: ValidationCheck[] = [];
  const done = (dataset: PbsCpiDataset | null): LoadResult => ({ dataset: checks.some((c) => c.status === "fail") ? null : dataset, report: { ok: !checks.some((c) => c.status === "fail"), checks } });

  const raw = readRaw(xml);

  // ── structure ──
  const byIndicator = new Map<string, RawSeries>();
  const duplicated: string[] = [];
  for (const s of raw.series) {
    if (byIndicator.has(s.indicator)) duplicated.push(s.indicator);
    byIndicator.set(s.indicator, s);
  }
  const missing = PBS_CPI_SERIES.filter((d) => !byIndicator.has(d.sdmxIndicator)).map((d) => d.sdmxIndicator);
  if (missing.length > 0) checks.push(fail("structure", "All 26 expected series are present", `Missing: ${list(missing)}`));
  else checks.push(pass("structure", "All 26 expected series are present", `${PBS_CPI_SERIES.length} found (${raw.series.length - PBS_CPI_SERIES.length} other series in the file ignored)`));
  checks.push(duplicated.length > 0 ? fail("series-unique", "No series appears twice", `Repeated: ${list(duplicated)}`) : pass("series-unique", "No series appears twice", "each series once"));
  if (missing.length > 0) return done(null); // nothing further can be checked meaningfully

  const expected = PBS_CPI_SERIES.map((d) => ({ def: d, raw: byIndicator.get(d.sdmxIndicator) as RawSeries }));

  // ── periods and values, per series ──
  const dupPeriods: string[] = [];
  const badPeriods: string[] = [];
  const badValues: string[] = [];
  const gaps: string[] = [];
  const parsed = new Map<string, PbsSeriesPoint[]>();
  for (const { def, raw: s } of expected) {
    const seen = new Set<string>();
    const points: PbsSeriesPoint[] = [];
    for (const o of s.obs) {
      if (!PERIOD.test(o.period)) { badPeriods.push(`${def.sdmxIndicator} "${o.period}"`); continue; }
      if (seen.has(o.period)) { dupPeriods.push(`${def.sdmxIndicator} ${o.period}`); continue; }
      seen.add(o.period);
      const text = o.raw.trim();
      const value = NUMERIC.test(text) ? Number(text) : NaN;
      if (!Number.isFinite(value)) { badValues.push(`${def.sdmxIndicator} ${o.period} = "${o.raw}"`); continue; }
      points.push({ month: o.period, value, sourceText: text });
    }
    points.sort((a, b) => a.month.localeCompare(b.month));
    for (let i = 1; i < points.length; i++) {
      const step = monthIndex(points[i].month) - monthIndex(points[i - 1].month);
      if (step !== 1) gaps.push(`${def.sdmxIndicator}: ${points[i - 1].month} → ${points[i].month}`);
    }
    parsed.set(def.indicatorKey, points);
  }
  checks.push(badPeriods.length ? fail("period-format", "Every period is a valid YYYY-MM month", list(badPeriods)) : pass("period-format", "Every period is a valid YYYY-MM month", "all valid"));
  checks.push(dupPeriods.length ? fail("no-duplicates", "No period is duplicated within a series", list(dupPeriods)) : pass("no-duplicates", "No period is duplicated within a series", "none"));
  checks.push(badValues.length ? fail("values-finite", "Every value is a finite number (none read as zero)", list(badValues)) : pass("values-finite", "Every value is a finite number (none read as zero)", "all finite"));
  checks.push(gaps.length ? fail("no-gaps", "Every series covers consecutive months with no gap", list(gaps)) : pass("no-gaps", "Every series covers consecutive months with no gap", "no gaps"));

  // ── identical periods across the 26 series ──
  const monthSets = expected.map(({ def }) => (parsed.get(def.indicatorKey) as PbsSeriesPoint[]).map((p) => p.month));
  const reference = monthSets.reduce((a, b) => (b.length > a.length ? b : a), [] as string[]);
  const refSet = new Set(reference);
  const inconsistent = expected
    .map(({ def }, i) => ({ def, n: monthSets[i].length, absent: reference.filter((m) => !new Set(monthSets[i]).has(m)), extra: monthSets[i].filter((m) => !refSet.has(m)) }))
    .filter((x) => x.absent.length > 0 || x.extra.length > 0 || x.n === 0)
    .map((x) => `${x.def.sdmxIndicator} lacks ${x.absent.length} of ${reference.length} months${x.absent.length ? ` (${list(x.absent, 3)})` : ""}`);
  checks.push(inconsistent.length || reference.length === 0 ? fail("same-periods", "All 26 series cover exactly the same months", reference.length === 0 ? "No observations at all" : list(inconsistent)) : pass("same-periods", "All 26 series cover exactly the same months", `${reference.length} months: ${reference[0]} … ${reference[reference.length - 1]}`));

  // ── attributes and base period ──
  const idxSeries = expected.filter((e) => e.def.kind === "headlineIndex" || e.def.kind === "groupIndex");
  const bases = [...new Set(idxSeries.map((e) => e.raw.attrs.get("BASE_PER") ?? "(none)"))];
  const basePeriod = bases.length === 1 ? bases[0] : "";
  if (bases.length !== 1) checks.push(fail("base-period", "One supported base period across the 13 index series", `Found ${bases.length} different base periods: ${bases.join(", ")}`));
  else if (!SUPPORTED_BASE_PERIODS.includes(basePeriod)) checks.push(fail("base-period", "One supported base period across the 13 index series", `Base period "${basePeriod}" is not supported (supported: ${SUPPORTED_BASE_PERIODS.join(", ")}). A new base period means new weights and needs a decision before ingestion.`));
  else checks.push(pass("base-period", "One supported base period across the 13 index series", `${basePeriod} (index ${baseLabel(basePeriod)} = 100)`));

  const weightBaseIssues = expected.filter((e) => e.def.kind === "groupWeight" || e.def.kind === "weightTotal").filter((e) => { const b = e.raw.attrs.get("BASE_PER"); return b !== "_Z" && b !== basePeriod; }).map((e) => `${e.def.sdmxIndicator} BASE_PER="${e.raw.attrs.get("BASE_PER")}"`);
  checks.push(weightBaseIssues.length ? fail("weight-base", "Weight series declare no base of their own (or the same one)", list(weightBaseIssues)) : pass("weight-base", "Weight series declare no base of their own (or the same one)", "BASE_PER is not-applicable (_Z)"));

  const attrIssues = expected.filter((e) => e.raw.attrs.get("FREQ") !== "M" || e.raw.attrs.get("REF_AREA") !== "PK" || e.raw.attrs.get("DATA_DOMAIN") !== "CPI").map((e) => `${e.def.sdmxIndicator} (FREQ=${e.raw.attrs.get("FREQ")}, REF_AREA=${e.raw.attrs.get("REF_AREA")}, DATA_DOMAIN=${e.raw.attrs.get("DATA_DOMAIN")})`);
  checks.push(attrIssues.length ? fail("attributes", "All series are monthly, Pakistan, CPI domain", list(attrIssues)) : pass("attributes", "All series are monthly, Pakistan, CPI domain", "FREQ=M, REF_AREA=PK, DATA_DOMAIN=CPI"));

  // ── weights ──
  const pts = (key: string) => parsed.get(key) as PbsSeriesPoint[];
  const groupWeights = expected.filter((e) => e.def.kind === "groupWeight");
  const totalSeries = pts("pbs:cpiWeightTotal");
  const sumIssues: string[] = [];
  for (let i = 0; i < reference.length; i++) {
    const month = reference[i];
    const sum = groupWeights.reduce((s, e) => s + (pts(e.def.indicatorKey).find((p) => p.month === month)?.value ?? NaN), 0);
    const total = totalSeries.find((p) => p.month === month)?.value ?? NaN;
    if (!(Math.abs(sum - 100) <= WEIGHT_SUM_TOLERANCE)) sumIssues.push(`${month}: group weights total ${Number.isNaN(sum) ? "n/a" : sum.toFixed(4)}`);
    else if (!(Math.abs(total - 100) <= WEIGHT_SUM_TOLERANCE)) sumIssues.push(`${month}: total-weight series is ${Number.isNaN(total) ? "n/a" : total.toFixed(4)}`);
  }
  checks.push(sumIssues.length ? fail("weight-total", `Weights total 100 ± ${WEIGHT_SUM_TOLERANCE} in every month`, list(sumIssues)) : pass("weight-total", `Weights total 100 ± ${WEIGHT_SUM_TOLERANCE} in every month`, `group weights and the total-weight series, ${reference.length} months`));

  const nonConstant = groupWeights.filter((e) => { const v = pts(e.def.indicatorKey).map((p) => p.value); return v.length > 0 && Math.max(...v) - Math.min(...v) > 1e-6; }).map((e) => e.def.sdmxIndicator);
  checks.push(nonConstant.length ? fail("weights-constant", "Each group weight is constant within the base period", `Changes over time: ${list(nonConstant)}`) : pass("weights-constant", "Each group weight is constant within the base period", "12 weights, fixed"));

  const nonPositive = groupWeights.filter((e) => pts(e.def.indicatorKey).some((p) => !(p.value > 0 && p.value < 100))).map((e) => e.def.sdmxIndicator);
  checks.push(nonPositive.length ? fail("weights-range", "Each weight lies strictly between 0 and 100", list(nonPositive)) : pass("weights-range", "Each weight lies strictly between 0 and 100", "all in range"));

  // ── header ──
  let preparedAt: string | null = null;
  if (raw.headerPrepared === null) checks.push(warn("header-prepared", "File header carries a valid Prepared timestamp", "No <Prepared> in the header: source_updated_at will be null (never inferred)."));
  else {
    const d = new Date(raw.headerPrepared);
    if (Number.isNaN(d.getTime()) || !raw.headerPrepared.includes("T")) checks.push(fail("header-prepared", "File header carries a valid Prepared timestamp", `Unparseable: "${raw.headerPrepared}"`));
    else { preparedAt = d.toISOString(); checks.push(pass("header-prepared", "File header carries a valid Prepared timestamp", preparedAt)); }
  }
  checks.push(raw.dataSetId ? pass("header-dataset-id", "File header carries a DataSetID", raw.dataSetId) : warn("header-dataset-id", "File header carries a DataSetID", "Absent: recorded as null."));

  // ── the F.1 gate, reused unchanged ──
  // Only meaningful once the structure above is sound; F.1's parser tolerates what the checks above reject.
  if (!checks.some((c) => c.status === "fail")) {
    const f1 = parseCpiGroupPanel(xml);
    if (f1.panel === null) checks.push(fail("laspeyres", "Group indices reproduce the headline index (F.1 integrity gate)", list(f1.issues)));
    else {
      const wSum = f1.panel.groups.reduce((s, g) => s + g.weight, 0);
      let worst = 0;
      for (const m of f1.panel.months) {
        const agg = f1.panel.groups.reduce((s, g) => s + g.weight * (g.index.get(m) as number), 0) / wSum;
        worst = Math.max(worst, Math.abs(agg - (f1.panel.headlineIndex.get(m) as number)));
      }
      checks.push(pass("laspeyres", "Group indices reproduce the headline index (F.1 integrity gate)", `largest gap ${worst.toFixed(4)} index points over ${f1.panel.months.length} months (limit ${LASPEYRES_TOLERANCE})`));
    }
  }

  if (checks.some((c) => c.status === "fail")) return done(null);

  const series = new Map<string, { definition: PbsSeriesDefinition; points: readonly PbsSeriesPoint[] }>();
  for (const { def } of expected) series.set(def.indicatorKey, { definition: def, points: pts(def.indicatorKey) });
  return done({ fileUrl, dataSetId: raw.dataSetId, preparedAt, declaredSource: raw.declaredSource, basePeriod, months: reference, series });
}

// ───────────────────────────── normalisation ─────────────────────────────

function unitFor(def: PbsSeriesDefinition, basePeriod: string): string {
  if (def.kind === "headlineIndex" || def.kind === "groupIndex") return `Index (${baseLabel(basePeriod)}=100)`;
  if (def.kind === "weightTotal") return "% of basket (all groups)";
  return "% of basket";
}

function methodologyFor(def: PbsSeriesDefinition, basePeriod: string): string {
  if (def.kind === "groupWeight" || def.kind === "weightTotal") return `Fixed base-period basket weight (Laspeyres), base ${basePeriod}`;
  return `Fixed-weight (Laspeyres) price index, base ${basePeriod}`;
}

export function sourceReferenceFor(dataset: PbsCpiDataset, def: PbsSeriesDefinition, sourceText: string): Record<string, unknown> {
  return {
    file: dataset.fileUrl,
    dataSetId: dataset.dataSetId,
    sdmxIndicator: def.sdmxIndicator,
    dataDomain: "CPI",
    refArea: "PK",
    frequency: "M",
    basePeriod: dataset.basePeriod,
    methodology: methodologyFor(def, dataset.basePeriod),
    declaredSource: dataset.declaredSource,
    sourceValue: sourceText,
  };
}

/** One series' observations in the orchestrator's contract, ascending, full source precision. */
export function observationsFor(dataset: PbsCpiDataset, indicatorKey: string): NormalizedObservation[] {
  const entry = dataset.series.get(indicatorKey);
  if (!entry) throw new Error(`pbsCpiGroupsAdapter: unknown indicator key "${indicatorKey}"`);
  const { definition: def, points } = entry;
  return points.map((p) => ({
    indicatorKey,
    observationPeriod: monthEnd(p.month),
    value: p.value,
    unit: unitFor(def, dataset.basePeriod),
    cadence: "monthly",
    provider: PBS_SDMX_PROVIDER_ID,
    sourceSeriesId: def.sdmxIndicator,
    qualityStatus: "official",
    releaseDate: null,
    sourceUpdatedAt: dataset.preparedAt,
    sourceReference: sourceReferenceFor(dataset, def, p.sourceText),
    methodology: methodologyFor(def, dataset.basePeriod),
  }));
}

/**
 * The adapter, built from an ALREADY-VALIDATED dataset. It performs no network
 * request (so the orchestrator's retries re-read memory, not PBS) and cannot be
 * constructed from unvalidated data.
 */
export function createPbsCpiGroupsAdapter(dataset: PbsCpiDataset): ProviderAdapter {
  return {
    providerId: PBS_SDMX_PROVIDER_ID,
    async fetchObservations({ indicatorKey }) {
      return observationsFor(dataset, indicatorKey);
    },
  };
}

/** "2026-10-31" -> "2026-10": for reports and tests. */
export function periodToMonth(observationPeriod: string): MonthKey {
  return observationPeriod.slice(0, 7);
}

