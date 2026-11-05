// Shared value/observation presentation for the redesigned homepage
// (PEIC redesign Phase 3). Server-compatible (no hooks).
//
// Every helper here is display-only: it formats values that other code has
// already computed and never derives an economic figure of its own. The one
// piece of logic is parsing the leading signed number out of an existing
// `Kpi.change` string (e.g. "-0.8 pp vs Aug 2026") to decide whether the
// change reads as up, down or flat — the identical approach makeTickerItem()
// in the overview page already uses, kept consistent so one change string can
// never render as "up" in one place and "down" in another.

import type { Kpi } from "@/data/kpiData";
import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";
import { formatLatestDate } from "@/lib/dataFreshness";

export type ChangeTone = "up" | "down" | "flat";

/**
 * The direction encoded in a `Kpi.change` string, or null when the string
 * carries no leading number (e.g. "YoY change", "No prior period").
 *
 * Deliberately NOT `Kpi.trend`: for growth-rate indicators trend means "the
 * level is positive/negative", which can disagree with the direction of the
 * latest move (LSM can have trend="up" while change="-5.1 pp vs last month").
 * The change string is always a delta against the previous period.
 */
export function changeTone(change: string | undefined): ChangeTone | null {
  if (!change) return null;
  const m = change.trim().match(/^([+-]?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? "up" : n < 0 ? "down" : "flat";
}

const TONE_CLASS: Record<ChangeTone, string> = {
  up: "text-pe-up",
  down: "text-pe-down",
  flat: "text-pe-text-3",
};

const TONE_GLYPH: Record<ChangeTone, string> = { up: "▲", down: "▼", flat: "—" };

/**
 * A change string with a direction arrow. Green/red here mean "rose/fell
 * versus the previous observation" — never "good/bad": a rising debt ratio
 * and rising reserves are both green.
 */
export function ChangeValue({ change, className = "" }: { change: string | undefined; className?: string }) {
  const tone = changeTone(change);
  if (!change) return null;
  if (!tone) return <span className={`text-pe-text-3 ${className}`}>{change}</span>;
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${TONE_CLASS[tone]} ${className}`}>
      <span aria-hidden="true">{TONE_GLYPH[tone]}</span>
      {change}
    </span>
  );
}

/**
 * The one-line provenance stamp: observation period, then source. These are
 * two different things and the distinction matters — the observation date is
 * the period the figure reports on, never when it was fetched.
 */
export function SourceStamp({ kpi, className = "" }: { kpi: Pick<Kpi, "latestDate" | "frequency" | "source">; className?: string }) {
  const parts: string[] = [];
  if (kpi.latestDate) parts.push(formatLatestDate(kpi.latestDate, kpi.frequency));
  if (kpi.source) parts.push(kpi.source);
  if (parts.length === 0) return null;
  return <span className={`font-mono text-[11px] text-pe-text-3 ${className}`}>{parts.join(" · ")}</span>;
}

/**
 * Freshness pill driven by the project's existing severity verdict. Labels
 * come from the caller (FRESHNESS_STATE_LABEL / the dataFreshness status), so
 * this component never decides what counts as stale.
 */
export function FreshnessPill({ severity, label }: { severity: FreshnessResult["severity"]; label: string }) {
  // The engine's three severities. Caution/problem use their own tokens
  // (defined for both themes in globals.css) rather than Tailwind palette
  // literals, which would only be legible in one theme.
  const cls =
    severity === "healthy"
      ? "border-pe-border bg-pe-surface-2 text-pe-text-3"
      : severity === "caution"
        ? "border-[var(--pe-warn-border)] bg-[var(--pe-warn-bg)] text-[var(--pe-warn-text)]"
        : "border-[var(--pe-crit-border)] bg-[var(--pe-crit-bg)] text-[var(--pe-crit-text)]";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
