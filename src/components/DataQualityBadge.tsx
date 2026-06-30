import type { Kpi } from "@/data/kpiData";
import { getDataQuality, DATA_QUALITY_DOT } from "@/lib/dataQuality";
import { formatLatestDate, getClosureMessage } from "@/lib/dataFreshness";

// The one shared renderer for "where did this number come from, and how
// fresh is it" — consumed by KpiCard, SEO landing pages, charts, and the
// System Health page, so the five states (Verified/Delayed/Cached/
// Fallback/Unavailable) always look and mean the same thing everywhere
// rather than each surface inventing its own badge.

type BadgeKpi = Pick<Kpi, "source" | "latestDate" | "frequency" | "marketType" | "expectedReleaseDate" | "releaseAlreadyReflected" | "sourceStatus" | "snapshotDate">;

interface Props {
  kpi: BadgeKpi;
  /** Extra fields shown after the dot+label — source name, date, frequency. Omit for a compact dot+label-only badge (e.g. inside a denser table row). */
  showDetails?: boolean;
  className?: string;
  /** Appended to the tooltip — e.g. KpiCard's primary/secondary/fallback source-chain note. */
  extraTooltip?: string;
}

export default function DataQualityBadge({ kpi, showDetails = true, className, extraTooltip }: Props) {
  const quality = getDataQuality({
    sourceStatus: kpi.sourceStatus ?? "live",
    latestDate: kpi.latestDate,
    frequency: kpi.frequency,
    marketType: kpi.marketType,
    expectedReleaseDate: kpi.expectedReleaseDate,
    releaseAlreadyReflected: kpi.releaseAlreadyReflected,
    snapshotDate: kpi.snapshotDate,
  });
  const dotClass = DATA_QUALITY_DOT[quality.state];
  const displayDate = formatLatestDate(kpi.latestDate, kpi.frequency);
  const closureMessage = quality.freshnessStatus ? getClosureMessage(quality.freshnessStatus, kpi.marketType) : null;

  if (!showDetails) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${dotClass} ${className ?? ""}`} title={quality.description}>
        <span className="text-[8px]">&#9679;</span>
        {quality.state}
      </span>
    );
  }

  return (
    <div className={className}>
      <div
        suppressHydrationWarning
        className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/40 light:text-slate-400"
        title={`${quality.state} · ${quality.description}${kpi.source ? ` · ${kpi.source}` : ""} · ${displayDate}${kpi.frequency ? ` · ${kpi.frequency}` : ""}${extraTooltip ? ` · ${extraTooltip}` : ""}`}
      >
        <span className={`text-[8px] ${dotClass}`}>&#9679;</span>
        <span className={dotClass}>{quality.state}</span>
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
      {closureMessage && (
        <p suppressHydrationWarning className={`mt-1 text-[10px] leading-snug ${dotClass}`}>
          {closureMessage}
        </p>
      )}
    </div>
  );
}
