import type { DateTimeClassification, EventRecord } from "@/lib/economicCalendar/economicEventsRepo";
import { getReleaseFrequencyLabel, type NextExpectedRelease } from "@/lib/economicCalendar/releaseFrequency";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateOnly(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const DATE_TIME_CLASSIFICATION_META: Record<DateTimeClassification, { label: string; description: string; className: string }> = {
  confirmed: {
    label: "Confirmed",
    description: "Official date and official time have both been published by the source.",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  },
  official_date_only: {
    label: "Official Date Only",
    description: "An official advance calendar confirms the date; no official release time has been announced.",
    className: "border-sky-400/30 bg-sky-400/10 text-sky-400",
  },
  estimated: {
    label: "Estimated",
    description: "Inferred from historical publishing patterns — no official advance calendar confirms this date/time.",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  },
  manual: {
    label: "Manual",
    description: "Not predictable from an official source — no issuing body publishes a release calendar for this item.",
    className: "border-rose-400/30 bg-rose-400/10 text-rose-400",
  },
};

/** Source / Last Updated / Release Frequency / Next Expected Release / Date Certainty / Data Confidence — shown on every event/archive detail page so a visitor can judge how much to trust a given figure (and its scheduling), at a glance. */
export default function DataQualityFooter({ event, nextExpectedRelease }: { event: EventRecord; nextExpectedRelease: NextExpectedRelease }) {
  const confidenceLabel = event.dataConfidence === "confirmed" ? "Confirmed" : "Estimated";
  const confidenceClass =
    event.dataConfidence === "confirmed"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
      : "border-amber-400/30 bg-amber-400/10 text-amber-400";
  const dateTimeMeta = DATE_TIME_CLASSIFICATION_META[event.dateTimeClassification];

  return (
    <section className="glass-card mt-6 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white light:text-slate-900">Data Quality</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Source</p>
          <p className="mt-1 text-sm text-white/80 light:text-slate-700">{event.series.sourceName}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Last Updated</p>
          <p className="mt-1 text-sm text-white/80 light:text-slate-700">{formatTimestamp(event.updatedAt)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Value Confidence</p>
          <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${confidenceClass}`}>{confidenceLabel}</span>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Release Frequency</p>
          <p className="mt-1 text-sm text-white/80 light:text-slate-700">{getReleaseFrequencyLabel(event.series.slug, event.series.cadence)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Next Expected Release</p>
          <p className="mt-1 text-sm text-white/80 light:text-slate-700">
            {formatDateOnly(nextExpectedRelease.date)}
            {nextExpectedRelease.isEstimated && <span className="ml-1.5 text-white/30 light:text-slate-400">(estimated)</span>}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Date/Time Certainty</p>
          <span title={dateTimeMeta.description} className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${dateTimeMeta.className}`}>
            {dateTimeMeta.label}
          </span>
        </div>
      </div>
    </section>
  );
}
