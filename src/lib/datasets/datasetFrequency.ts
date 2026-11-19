// Download Datasets: frequency selection and date filtering. PURE and client-safe (no I/O, no server-only imports), so the page, the browser component,
// the export route and the tests all use exactly the same rules.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: a series only ever has the frequency its source publishes. Nothing here converts, aggregates, interpolates, repeats
// or spreads observations from one frequency into another. "Selecting a frequency" means FILTERING THE CATALOGUE to series that genuinely have it.
//
// Periods are carried exactly as the source states them: a dated observation ("2026-09-30"), a calendar year ("2025"), or a Pakistani fiscal year
// ("FY2025", July of the previous year to 30 June). A quarterly series carries its quarter-end date plus the source's own label ("Q3 FY26").

/** How a period is written down, so the exporter never reformats a fiscal label into a calendar date. */
export type PeriodKind =
  /** A specific observation date, "YYYY-MM-DD". */
  | "date"
  /** A calendar year, "2025". */
  | "year"
  /** A fiscal year ending 30 June, carried as its own label (e.g. FY2025). */
  | "fiscalYear"
  /** A fiscal-year quarter, carried as its quarter-END date ("2025-12-31") with the source's own label ("Q2 FY26"). Q1 = Jul-Sep. */
  | "quarter";

export type FrequencyId = "yearly" | "quarterly" | "monthly" | "weekly" | "as-announced";

/** Display order. The first three are the standard choices; the others appear only when at least one series genuinely has that cadence. */
export const FREQUENCY_ORDER: readonly FrequencyId[] = ["yearly", "quarterly", "monthly", "weekly", "as-announced"];
/** Always offered, even when empty, so a visitor learns that a frequency is not available rather than wondering whether it was forgotten. */
export const STANDARD_FREQUENCIES: readonly FrequencyId[] = ["yearly", "quarterly", "monthly"];

export const FREQUENCY_LABEL: Record<FrequencyId, string> = {
  yearly: "Yearly",
  quarterly: "Quarterly",
  monthly: "Monthly",
  weekly: "Weekly",
  "as-announced": "As announced",
};

export function isFrequencyId(value: string | null | undefined): value is FrequencyId {
  return value != null && (FREQUENCY_ORDER as readonly string[]).includes(value);
}

/** Maps a source's own frequency wording ("Monthly", "As-Needed", "Annual", ...) onto the catalogue's frequency ids. Unknown wording returns null. */
export function frequencyFromDeclared(declared: string | null | undefined): FrequencyId | null {
  switch ((declared ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-")) {
    case "annual":
    case "yearly":
      return "yearly";
    case "quarterly":
      return "quarterly";
    case "monthly":
      return "monthly";
    case "weekly":
      return "weekly";
    case "as-needed":
    case "as-announced":
    case "irregular":
      return "as-announced";
    default:
      return null;
  }
}

/** The message shown when a frequency has nothing to offer. Never suggests converting from another frequency. */
export function unavailableFrequencyMessage(frequency: FrequencyId, scope: "indicator" | "catalogue" = "catalogue"): string {
  const label = FREQUENCY_LABEL[frequency];
  return scope === "indicator"
    ? `${label} observations are not currently available for this indicator. Please select another frequency.`
    : `${label} observations are not currently available for any indicator. Please select another frequency.`;
}

// ── Periods ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidIsoDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export interface PeriodSpan {
  /** First day the period covers, "YYYY-MM-DD". */
  start: string;
  /** Last day the period covers, "YYYY-MM-DD". */
  end: string;
  /** The year the period is LABELLED with: the date's year, the calendar year, or the year a fiscal year ends in. */
  labelYear: number;
}

/** What a period string covers. Null when the string is not a recognised period (it is then never silently included in a date-filtered file). */
export function periodSpan(period: string): PeriodSpan | null {
  const date = ISO_DATE.exec(period);
  if (date) {
    const [y, m, d] = [Number(date[1]), Number(date[2]), Number(date[3])];
    return isValidIsoDate(y, m, d) ? { start: period, end: period, labelYear: y } : null;
  }
  if (/^\d{4}$/.test(period)) {
    const y = Number(period);
    return { start: `${y}-01-01`, end: `${y}-12-31`, labelYear: y };
  }
  const fy = /^FY(\d{4})$/.exec(period);
  if (fy) {
    const y = Number(fy[1]);
    return { start: `${y - 1}-07-01`, end: `${y}-06-30`, labelYear: y };
  }
  return null;
}

/** "Q3 FY26" -> "2026-03-31" (quarter-end date). Pakistan's fiscal year runs July-June: Q1 = Jul-Sep, Q2 = Oct-Dec, Q3 = Jan-Mar, Q4 = Apr-Jun. */
export function quarterLabelToEndDate(label: string): string | null {
  const m = /^Q([1-4])\s+FY\s?(\d{2}|\d{4})$/i.exec(label.trim());
  if (!m) return null;
  const q = Number(m[1]);
  const fyEnd = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  // Q1 and Q2 fall in the calendar year BEFORE the fiscal year ends; Q3 and Q4 in the year it ends.
  switch (q) {
    case 1: return `${fyEnd - 1}-09-30`;
    case 2: return `${fyEnd - 1}-12-31`;
    case 3: return `${fyEnd}-03-31`;
    default: return `${fyEnd}-06-30`;
  }
}

/** Orders rows by the period they cover, earliest first. Stable; rows whose period cannot be read keep their relative order at the end. */
export function sortChronologically<T extends { period: string }>(rows: readonly T[]): T[] {
  const keyed = rows.map((row, index) => ({ row, index, span: periodSpan(row.period) }));
  keyed.sort((a, b) => {
    if (a.span && b.span) {
      return a.span.end < b.span.end ? -1 : a.span.end > b.span.end ? 1 : a.span.start < b.span.start ? -1 : a.span.start > b.span.start ? 1 : a.index - b.index;
    }
    if (a.span) return -1;
    if (b.span) return 1;
    return a.index - b.index;
  });
  return keyed.map((k) => k.row);
}

// ── Date bounds ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type BoundPrecision = "year" | "month" | "day";

export interface DateBound {
  precision: BoundPrecision;
  /** The year, for a year-precision bound. */
  year: number;
  /** The bound as a date: the FIRST day of the period for a "from" bound, the LAST day for a "to" bound. */
  iso: string;
}

/**
 * Reads a bound typed or picked by a visitor: "2020", "2020-03" or "2020-03-15". `edge` decides which day a coarse bound means: "from 2020-03"
 * starts on 1 March, "to 2020-03" ends on 31 March. Anything else (including an incomplete "20") returns null, which means "no bound".
 */
export function parseBound(input: string | null | undefined, edge: "from" | "to"): DateBound | null {
  const text = (input ?? "").trim();
  let m = /^(\d{4})$/.exec(text);
  if (m) {
    const y = Number(m[1]);
    return { precision: "year", year: y, iso: edge === "from" ? `${y}-01-01` : `${y}-12-31` };
  }
  m = /^(\d{4})-(\d{2})$/.exec(text);
  if (m) {
    const [y, mo] = [Number(m[1]), Number(m[2])];
    if (mo < 1 || mo > 12) return null;
    const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    return { precision: "month", year: y, iso: edge === "from" ? `${y}-${pad(mo)}-01` : `${y}-${pad(mo)}-${pad(last)}` };
  }
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidIsoDate(y, mo, d) ? { precision: "day", year: y, iso: text } : null;
  }
  return null;
}

/**
 * Is this period inside the selected range?
 *   - A YEAR bound compares the year a period is LABELLED with, so "from 2020" includes FY2020 and calendar 2020 and "to 2020" excludes FY2021
 *     (which merely starts in mid-2020).
 *   - A MONTH or DAY bound compares the period's dates: a period is inside only if it lies entirely within the bound.
 * A period that cannot be read is outside any range that has a bound.
 */
export function periodInRange(period: string, from: DateBound | null, to: DateBound | null): boolean {
  if (!from && !to) return true;
  const span = periodSpan(period);
  if (!span) return false;
  if (from) {
    if (from.precision === "year" ? span.labelYear < from.year : span.start < from.iso) return false;
  }
  if (to) {
    if (to.precision === "year" ? span.labelYear > to.year : span.end > to.iso) return false;
  }
  return true;
}

export function filterRowsByRange<T extends { period: string }>(rows: readonly T[], from?: string | null, to?: string | null): T[] {
  const f = parseBound(from, "from");
  const t = parseBound(to, "to");
  return rows.filter((r) => periodInRange(r.period, f, t));
}

/** "Both bounds are well-formed and not reversed". An empty bound is fine; a half-typed one is reported so the UI/route can say so. */
export function validateRange(from?: string | null, to?: string | null): { ok: true } | { ok: false; error: string } {
  const fromText = (from ?? "").trim();
  const toText = (to ?? "").trim();
  const f = parseBound(fromText, "from");
  const t = parseBound(toText, "to");
  if (fromText && !f) return { ok: false, error: `"${fromText}" is not a valid start date. Use YYYY, YYYY-MM or YYYY-MM-DD.` };
  if (toText && !t) return { ok: false, error: `"${toText}" is not a valid end date. Use YYYY, YYYY-MM or YYYY-MM-DD.` };
  if (f && t && f.iso > t.iso) return { ok: false, error: "The start date is after the end date." };
  return { ok: true };
}

export function describeRange(rows: readonly { period: string }[]): string | null {
  return rows.length === 0 ? null : `${rows[0].period} to ${rows[rows.length - 1].period}`;
}

// ── Checking the declared frequency against the data ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The cadence the observation dates actually show, from the MEDIAN gap between consecutive periods (robust to a few missing observations).
 * Null when there are fewer than four observations or the spacing is irregular. A declared frequency is a claim; this is the check on that claim.
 */
export function observedCadence(periods: readonly string[]): FrequencyId | null {
  const ends = periods.map((p) => periodSpan(p)).filter((s): s is PeriodSpan => s !== null).map((s) => Date.parse(`${s.end}T00:00:00Z`)).sort((a, b) => a - b);
  if (ends.length < 4) return null;
  const gaps = ends.slice(1).map((t, i) => (t - ends[i]) / 86_400_000).filter((g) => g > 0).sort((a, b) => a - b);
  if (gaps.length < 3) return null;
  const median = gaps[Math.floor(gaps.length / 2)];
  if (median >= 5 && median <= 9) return "weekly";
  if (median >= 27 && median <= 33) return "monthly";
  if (median >= 85 && median <= 96) return "quarterly";
  if (median >= 360 && median <= 370) return "yearly";
  return null;
}

export interface ResolvedFrequency {
  id: FrequencyId | null;
  declared: FrequencyId | null;
  observed: FrequencyId | null;
  /** True when the data's spacing clearly contradicts the declared frequency; the OBSERVED cadence is then used. */
  mismatch: boolean;
}

/**
 * The frequency a series is filed under. The declared frequency stands unless the observation dates clearly show another cadence; "as announced"
 * series are irregular by definition, so they are never overridden by an observed cadence.
 */
export function resolveFrequency(declaredText: string | null | undefined, periods: readonly string[]): ResolvedFrequency {
  const declared = frequencyFromDeclared(declaredText);
  const observed = observedCadence(periods);
  const mismatch = declared !== null && declared !== "as-announced" && observed !== null && observed !== declared;
  return { id: mismatch ? observed : declared, declared, observed, mismatch };
}

// ── Catalogue selection (used by the browser component; pure so it is testable without a DOM) ──────────────────────────────────────────────────

export interface SelectableDataset {
  id: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  source: string;
  frequencyId: FrequencyId | null;
  /** Observations in chronological order: [period, value, optional source label such as "Q3 FY26"]. */
  points: ReadonlyArray<readonly [string, number, string?]>;
  /** The series could not be read at all. */
  error?: string;
}

export interface Selection {
  frequency: FrequencyId | "all";
  from: string;
  to: string;
  query: string;
  category: string;
}

export interface SelectedDataset<T extends SelectableDataset> {
  dataset: T;
  /** Observations inside the date range, in chronological order. */
  inRange: ReadonlyArray<readonly [string, number, string?]>;
}

/** Datasets of one frequency (or all), before any date filter: the basis for "available range" and for the per-frequency counts. */
export function datasetsForFrequency<T extends SelectableDataset>(all: readonly T[], frequency: FrequencyId | "all"): T[] {
  return all.filter((d) => frequency === "all" || d.frequencyId === frequency);
}

export function countByFrequency(all: readonly SelectableDataset[]): Record<FrequencyId, number> {
  const out = { yearly: 0, quarterly: 0, monthly: 0, weekly: 0, "as-announced": 0 } as Record<FrequencyId, number>;
  for (const d of all) if (d.frequencyId) out[d.frequencyId] += 1;
  return out;
}

/** Which frequency buttons to show: the three standard ones always; weekly / as-announced only when a series genuinely has them. */
export function offeredFrequencies(counts: Record<FrequencyId, number>): FrequencyId[] {
  return FREQUENCY_ORDER.filter((f) => STANDARD_FREQUENCIES.includes(f) || counts[f] > 0);
}

/** The earliest and latest observation among the given datasets, as periods exactly as published. Null when none has data. */
export function availableRange(datasets: readonly SelectableDataset[]): { first: string; last: string } | null {
  let first: { p: string; key: string } | null = null;
  let last: { p: string; key: string } | null = null;
  for (const d of datasets) {
    if (d.points.length === 0) continue;
    const a = d.points[0][0];
    const b = d.points[d.points.length - 1][0];
    const sa = periodSpan(a);
    const sb = periodSpan(b);
    if (sa && (!first || sa.start < first.key)) first = { p: a, key: sa.start };
    if (sb && (!last || sb.end > last.key)) last = { p: b, key: sb.end };
  }
  return first && last ? { first: first.p, last: last.p } : null;
}

export function selectDatasets<T extends SelectableDataset>(all: readonly T[], sel: Selection): SelectedDataset<T>[] {
  const q = sel.query.trim().toLowerCase();
  const from = parseBound(sel.from, "from");
  const to = parseBound(sel.to, "to");
  return datasetsForFrequency(all, sel.frequency)
    .filter((d) => {
      if (sel.category !== "All" && d.category !== sel.category) return false;
      if (!q) return true;
      return [d.name, d.description, d.source, d.unit, d.category].some((s) => s.toLowerCase().includes(q));
    })
    .map((dataset) => ({ dataset, inRange: dataset.points.filter((p) => periodInRange(p[0], from, to)) }));
}

// ── Download links ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type DownloadFormat = "xlsx" | "csv";

export interface DownloadOptions {
  format: DownloadFormat;
  from?: string;
  to?: string;
  /** Sent only when a specific frequency is selected: the route then REFUSES to serve a series of any other frequency. */
  frequency?: FrequencyId | "all";
}

function query(opts: DownloadOptions): string {
  const p = new URLSearchParams();
  p.set("format", opts.format);
  if (opts.frequency && opts.frequency !== "all") p.set("frequency", opts.frequency);
  if (parseBound(opts.from, "from")) p.set("from", (opts.from ?? "").trim());
  if (parseBound(opts.to, "to")) p.set("to", (opts.to ?? "").trim());
  return p.toString();
}

export function downloadHref(datasetId: string, opts: DownloadOptions): string {
  return `/api/datasets/${datasetId}?${query(opts)}`;
}

/** One file with every dataset of the selected frequency. With "all" there is no frequency to share, so only the workbook (one sheet per series) is offered. */
export function bulkHref(opts: DownloadOptions): string {
  return `/api/datasets/all?${query(opts)}`;
}
