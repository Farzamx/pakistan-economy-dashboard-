// Turns series observed on DIFFERENT dates (a policy rate that changes on decision days, auction yields on irregular auction days) into
// the rows a time-axis chart draws, WITHOUT resampling any series onto another's calendar. Pure: no I/O, no clock.
//
// Two kinds of series, drawn differently on purpose:
//   - "step": a value that HOLDS until the next observation (the policy rate, a running total). It is carried forward across the other
//     series' dates and out to the end of the axis, because "the rate in effect" is what a step series means.
//   - "observed": a value that exists only ON its observation dates (an auction yield). It is joined line-to-line between neighbouring
//     observations, but the line is BROKEN wherever two neighbours are further apart than `maxGapDays`, so a long silence is drawn as a
//     gap rather than as a straight line that suggests a value in between. Each unbroken stretch gets its own key ("pib#0", "pib#1", …).

import { dayNumberOf } from "@/lib/policyRate/analytics";

export const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const toTs = (iso: string): number => dayNumberOf(iso) * MS_PER_DAY;
export const tsToIso = (ts: number): string => new Date(ts).toISOString().slice(0, 10);

export interface DatedPoint {
  date: string;
  value: number;
  /** Extra text a tooltip may show beside this observation (e.g. which two auctions a spread compares). Not used for drawing. */
  note?: string;
}

export interface DateSeriesInput {
  key: string;
  kind: "step" | "observed";
  points: readonly DatedPoint[];
}

export interface DateRow {
  /** Midnight UTC of the row's date, milliseconds. */
  t: number;
  [key: string]: number | null;
}

export interface DateSegment {
  /** The key the row values live under ("pib#1"). */
  key: string;
  /** The series it belongs to ("pib"). */
  base: string;
  /** Observations in the stretch; a stretch of one is drawn as a dot, not a line. */
  length: number;
}

export interface DateChartData {
  rows: DateRow[];
  segments: DateSegment[];
  fromTs: number;
  toTs: number;
}

export interface BuildOptions {
  /** First day shown (ISO), or null/undefined for the earliest observation of any series. */
  from?: string | null;
  /** Last day shown (ISO): step series are carried out to it. */
  to: string;
  /** Largest distance between two observed neighbours that is still joined by a line. Default 75 days. */
  maxGapDays?: number;
}

const valid = (p: DatedPoint) => ISO_DATE.test(p.date) && Number.isFinite(p.value);

/** The latest observation dated on or before `iso`, or null. `points` must be ascending by date. */
export function asOfObservation(points: readonly DatedPoint[], iso: string): DatedPoint | null {
  let lo = 0;
  let hi = points.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].date <= iso) {
      best = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return best < 0 ? null : points[best];
}

export function buildDateChart(series: readonly DateSeriesInput[], opts: BuildOptions): DateChartData {
  const maxGap = opts.maxGapDays ?? 75;
  const toDay = dayNumberOf(opts.to);
  const clean = series.map((s) => ({ ...s, points: [...s.points].filter(valid).sort((a, b) => a.date.localeCompare(b.date)) }));
  const firstAny = clean.flatMap((s) => (s.points.length ? [dayNumberOf(s.points[0].date)] : []));
  const fromDay = opts.from ? dayNumberOf(opts.from) : firstAny.length ? Math.min(...firstAny) : toDay;
  const fromIso = tsToIso(fromDay * MS_PER_DAY);
  const toIso = tsToIso(toDay * MS_PER_DAY);

  const times = new Set<number>();
  const segments: DateSegment[] = [];
  const observedCells: { key: string; day: number; value: number }[] = [];
  const stepSeries: { key: string; points: DatedPoint[] }[] = [];

  for (const s of clean) {
    if (s.kind === "step") {
      // Everything dated in the window, plus the value already in effect when the window opens.
      const inside = s.points.filter((p) => p.date >= fromIso && p.date <= toIso);
      const carriedIn = asOfObservation(s.points, fromIso);
      const pts = carriedIn && (inside.length === 0 || inside[0].date > fromIso) ? [{ date: fromIso, value: carriedIn.value }, ...inside] : inside;
      if (pts.length === 0) continue;
      pts.forEach((p) => times.add(dayNumberOf(p.date)));
      times.add(toDay);
      stepSeries.push({ key: s.key, points: pts });
      segments.push({ key: s.key, base: s.key, length: pts.length });
    } else {
      const inside = s.points.filter((p) => p.date >= fromIso && p.date <= toIso);
      let seg = -1;
      let prevDay = Number.NEGATIVE_INFINITY;
      let count = 0;
      for (const p of inside) {
        const day = dayNumberOf(p.date);
        if (seg < 0 || day - prevDay > maxGap) {
          if (seg >= 0) segments[segments.length - 1].length = count;
          seg++;
          count = 0;
          segments.push({ key: `${s.key}#${seg}`, base: s.key, length: 0 });
        }
        count++;
        prevDay = day;
        times.add(day);
        observedCells.push({ key: `${s.key}#${seg}`, day, value: p.value });
      }
      if (seg >= 0) segments[segments.length - 1].length = count;
    }
  }

  const days = [...times].sort((a, b) => a - b);
  const rows: DateRow[] = days.map((d) => ({ t: d * MS_PER_DAY }));
  const rowOf = new Map(days.map((d, i) => [d, rows[i]]));
  for (const seg of segments) for (const r of rows) r[seg.key] = null;
  for (const c of observedCells) (rowOf.get(c.day) as DateRow)[c.key] = c.value;
  for (const s of stepSeries) {
    let i = 0;
    let current: number | null = null;
    for (const d of days) {
      while (i < s.points.length && dayNumberOf(s.points[i].date) <= d) current = s.points[i++].value;
      (rowOf.get(d) as DateRow)[s.key] = current;
    }
  }
  return { rows, segments, fromTs: fromDay * MS_PER_DAY, toTs: toDay * MS_PER_DAY };
}

// ── axis ticks ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface TimeTick {
  ts: number;
  label: string;
}

/** Calendar-aligned ticks: the smallest step (1, 3, 6, 12, 24, 60 months) that gives no more than `maxTicks`. Labelled by year when the step is a year or more. */
export function timeTicks(fromTs: number, toTs: number, maxTicks: number): TimeTick[] {
  if (!(toTs > fromTs) || maxTicks < 2) return [];
  const a = new Date(fromTs);
  const b = new Date(toTs);
  const startIndex = a.getUTCFullYear() * 12 + a.getUTCMonth();
  const endIndex = b.getUTCFullYear() * 12 + b.getUTCMonth();
  for (const step of [1, 3, 6, 12, 24, 60, 120]) {
    const first = Math.ceil(startIndex / step) * step; // aligned to January (and to quarters, half-years) of the calendar
    const ticks: TimeTick[] = [];
    for (let i = first; i <= endIndex; i += step) {
      const ts = Date.UTC(Math.floor(i / 12), i % 12, 1);
      if (ts < fromTs || ts > toTs) continue;
      const year = Math.floor(i / 12);
      ticks.push({ ts, label: step >= 12 ? String(year) : `${MONTH_NAMES[i % 12]} '${String(year).slice(2)}` });
    }
    if (ticks.length <= maxTicks) return ticks;
  }
  return [];
}
