import type { Kpi } from "@/data/kpiData";
import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";
import { FRESHNESS_STATE_LABEL, FRESHNESS_SEVERITY_DOT } from "@/lib/freshness/readModel";
import { formatLatestDate } from "@/lib/dataFreshness";

// The one shared renderer for "where did this number come from, and how
// fresh is it".
//
// PHASE 6 CHANGE — this component no longer DECIDES freshness, it DISPLAYS a
// verdict it is given. Previously it called getDataQuality(), which branched
// on `sourceStatus` first: a value whose delivery status was "live" was
// labelled Verified regardless of the observation's own age, which is exactly
// how a months-old canonical row could render as current. `freshness` is now
// a REQUIRED prop produced by src/lib/freshness/freshnessEngine.ts (the sole
// authority), so that class of bug is a type error rather than an oversight.
//
// sourceStatus is still shown, but strictly as DELIVERY provenance ("how this
// reached us"), never as an answer to "is this current".

type BadgeKpi = Pick<Kpi, "source" | "latestDate" | "frequency" | "marketType" | "sourceStatus" | "snapshotDate">;

interface Props {
  kpi: BadgeKpi;
  /**
   * The authoritative verdict. Required by design: making this optional would
   * reopen the exact hole Phase 6 closes.
   */
  freshness: FreshnessResult;
  /** Extra fields shown after the dot+label — source name, date, frequency. Omit for a compact dot+label-only badge (e.g. inside a denser table row). */
  showDetails?: boolean;
  className?: string;
  /** Appended to the tooltip — e.g. KpiCard's primary/secondary/fallback source-chain note. */
  extraTooltip?: string;
}

/** Delivery provenance worth disclosing to a reader. Never claims currency — that is `freshness`'s job alone. */
function deliveryNote(kpi: BadgeKpi): string | null {
  if (kpi.sourceStatus === "fallback") {
    return kpi.snapshotDate ? `Static snapshot captured ${kpi.snapshotDate}` : "Static snapshot — live source unreachable";
  }
  if (kpi.sourceStatus === "cache-stale") return "Live refresh failed — showing the last successfully retrieved value";
  if (kpi.sourceStatus === "unavailable") return "No value could be retrieved";
  return null;
}

export default function DataQualityBadge({ kpi, freshness, showDetails = true, className, extraTooltip }: Props) {
  const dotClass = FRESHNESS_SEVERITY_DOT[freshness.severity];
  const label = FRESHNESS_STATE_LABEL[freshness.state];
  const displayDate = formatLatestDate(kpi.latestDate, kpi.frequency);
  const delivery = deliveryNote(kpi);

  if (!showDetails) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${dotClass} ${className ?? ""}`} title={freshness.reason}>
        <span className="text-[8px]">&#9679;</span>
        {label}
      </span>
    );
  }

  return (
    <div className={className}>
      <div
        suppressHydrationWarning
        className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/40 light:text-slate-400"
        title={`${label} · ${freshness.reason}${kpi.source ? ` · ${kpi.source}` : ""} · ${displayDate}${kpi.frequency ? ` · ${kpi.frequency}` : ""}${delivery ? ` · ${delivery}` : ""}${extraTooltip ? ` · ${extraTooltip}` : ""}`}
      >
        <span className={`text-[8px] ${dotClass}`}>&#9679;</span>
        <span className={dotClass}>{label}</span>
        {kpi.source && (
          <>
            <span className="text-white/20 light:text-slate-300">&middot;</span>
            <span>{kpi.source}</span>
          </>
        )}
        <span className="text-white/20 light:text-slate-300">&middot;</span>
        <span>{displayDate}</span>
        {kpi.frequency && (
          <>
            <span className="text-white/20 light:text-slate-300">&middot;</span>
            <span>{kpi.frequency}</span>
          </>
        )}
      </div>
      {delivery && (
        <p suppressHydrationWarning className="mt-1 text-[10px] leading-snug text-white/35 light:text-slate-400">
          {delivery}
        </p>
      )}
    </div>
  );
}
