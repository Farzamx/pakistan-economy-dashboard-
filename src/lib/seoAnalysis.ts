// "What the data shows" sentences for the indicator pages, computed from the same series the page charts. Each sentence names the period it covers and
// says only what the numbers show: the latest value, the change across the window shown, and its high and low with their labels. No forecast, no cause.

import type { TrendPoint } from "@/components/charts/TrendLineChart";

export interface TrendAnalysisOptions {
  /** How a value is written, e.g. (v) => `$${v.toFixed(1)} billion`. */
  format: (v: number) => string;
  /** What the series is, in a sentence, e.g. "SBP's net liquid reserves". */
  subject: string;
  /** Unit word for differences, e.g. "percentage points"; omit to describe the change as a percentage of the starting value. */
  differenceUnit?: string;
}

export function trendAnalysis(points: readonly TrendPoint[] | null | undefined, o: TrendAnalysisOptions): string[] {
  const pts = (points ?? []).filter((p) => Number.isFinite(p.value));
  if (pts.length < 2) return [];
  const first = pts[0];
  const last = pts[pts.length - 1];
  let hi = pts[0];
  let lo = pts[0];
  for (const p of pts) {
    if (p.value > hi.value) hi = p;
    if (p.value < lo.value) lo = p;
  }
  const diff = last.value - first.value;
  const change = o.differenceUnit
    ? `${diff >= 0 ? "up" : "down"} ${Math.abs(diff).toFixed(2)} ${o.differenceUnit}`
    : first.value !== 0
      ? `${diff >= 0 ? "up" : "down"} ${Math.abs((diff / Math.abs(first.value)) * 100).toFixed(1)}%`
      : `${diff >= 0 ? "up" : "down"} ${o.format(Math.abs(diff))}`;
  const out = [`In the ${pts.length} observations shown (${first.month} to ${last.month}), ${o.subject} went from ${o.format(first.value)} to ${o.format(last.value)}, ${change}.`];
  if (hi !== last || lo !== first) out.push(`Its highest reading in that window was ${o.format(hi.value)} (${hi.month}) and its lowest ${o.format(lo.value)} (${lo.month}).`);
  return out;
}
