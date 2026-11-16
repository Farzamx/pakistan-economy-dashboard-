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
import { DIRECTION_GLYPH, splitChange } from "./overviewFormat";

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

const DIRECTION_WORD: Record<ChangeTone, string> = { up: "Up", down: "Down", flat: "Unchanged" };

/** Colour of the glyph and figure: green for an increase, red for a decrease, neutral when unchanged. Arithmetic direction only, not "good" or "bad". */
const DIRECTION_CLASS: Record<ChangeTone, string> = { up: "text-pe-up", down: "text-pe-down", flat: "text-pe-text-2" };

/** "0.50 pp vs 28 Apr 2026" -> figure "0.50 pp", comparison "vs 28 Apr 2026". A string with no " vs " is all figure. */
export function splitComparison(text: string): { figure: string; comparison: string | null } {
  const i = text.indexOf(" vs ");
  return i === -1 ? { figure: text, comparison: null } : { figure: text.slice(0, i), comparison: text.slice(i + 1) };
}

/**
 * A change string with a direction glyph. The glyph and the figure take the direction colour (▲ green, ▼ red, ◆ neutral); the comparison
 * ("vs Sep 2026") stays muted. The sign is dropped from the text because the glyph states it, and an sr-only word states it for screen readers.
 * `compact` drops the comparison, for cells too narrow to hold it.
 */
export function ChangeValue({ change, className = "", compact = false }: { change: string | undefined | null; className?: string; compact?: boolean }) {
  if (!change) return null;
  const parts = splitChange(change);
  // A string with no leading number ("No prior period", a provider's "fallback snapshot — …" sentinel) is not a change: show nothing rather than
  // print an internal note next to a figure. The status pill and the period line already say when a value is a fallback or stale.
  if (!parts) return null;
  const { figure, comparison } = splitComparison(parts.text);
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1 tabular-nums text-pe-text-2 ${className}`}>
      <span className={`inline-flex items-baseline gap-1 font-medium ${DIRECTION_CLASS[parts.direction]}`}>
        <span aria-hidden="true" className="text-[0.8em]">{DIRECTION_GLYPH[parts.direction]}</span>
        <span className="sr-only">{DIRECTION_WORD[parts.direction]}</span>
        {figure}
      </span>
      {!compact && comparison && <span>{comparison}</span>}
    </span>
  );
}

/** The four data statuses the Overview shows. */
export type StatusTone = "current" | "due" | "delayed" | "stale";

const STATUS_CLASS: Record<StatusTone, string> = {
  current: "border-pe-border bg-pe-surface-2 text-pe-up",
  due: "border-pe-border-strong bg-pe-surface-2 text-pe-accent",
  delayed: "border-[var(--pe-warn-border)] bg-[var(--pe-warn-bg)] text-[var(--pe-warn-text)]",
  stale: "border-[var(--pe-warn-border)] bg-[var(--pe-warn-bg)] text-[var(--pe-warn-text)]",
};

export function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-px text-[11px] font-medium ${STATUS_CLASS[tone]}`}>
      {label}
    </span>
  );
}

/**
 * Maps the freshness engine's own state to one of the page's statuses. This does not decide what is stale: it only names the engine's verdict.
 * A series with a release on today's calendar is "Due today" whatever its freshness state: the new figure is expected today, which is the more
 * useful thing to say than that the old one has aged.
 */
export function statusFor(state: FreshnessResult["state"] | undefined, dueToday: boolean): { tone: StatusTone; label: string } {
  if (dueToday) return { tone: "due", label: "Due today" };
  if (state === "stale" || state === "source-unavailable" || state === "validation-failed") return { tone: "stale", label: "Stale" };
  if (state === "delayed-release" || state === "ingestion-lagging") return { tone: "delayed", label: "Delayed" };
  return { tone: "current", label: "Current" };
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
