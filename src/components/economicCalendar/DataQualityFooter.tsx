import type { EventRecord } from "@/lib/economicCalendar/economicEventsRepo";
import { getReleaseFrequencyLabel, type NextExpectedRelease } from "@/lib/economicCalendar/releaseFrequency";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateOnly(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Source / Last Updated / Release Frequency / Next Expected Release / Data Confidence — shown on every event/archive detail page so a visitor can judge how much to trust a given figure, and how often to expect a new one, at a glance. */
export default function DataQualityFooter({ event, nextExpectedRelease }: { event: EventRecord; nextExpectedRelease: NextExpectedRelease }) {
  const confidenceLabel = event.dataConfidence === "confirmed" ? "Confirmed" : "Estimated";
  const confidenceClass =
    event.dataConfidence === "confirmed"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
      : "border-amber-400/30 bg-amber-400/10 text-amber-400";

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
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">Confidence</p>
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
      </div>
    </section>
  );
}
