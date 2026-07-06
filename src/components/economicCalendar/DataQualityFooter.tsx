"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { DateTimeClassification, EventRecord } from "@/lib/economicCalendar/economicEventsRepo";
import { getReleaseFrequencyLabel, type NextExpectedRelease } from "@/lib/economicCalendar/releaseFrequency";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateOnly(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function DataQualityFooter({ event, nextExpectedRelease }: { event: EventRecord; nextExpectedRelease: NextExpectedRelease }) {
  const { t } = useLanguage();

  const DATE_TIME_CLASSIFICATION_META: Record<DateTimeClassification, { label: string; description: string; className: string }> = {
    confirmed: {
      label: t("calendar.dsConfirmed"),
      description: t("calendar.dsConfirmedDesc"),
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
    },
    official_date_only: {
      label: t("calendar.dsOfficial"),
      description: t("calendar.dsOfficialDesc"),
      className: "border-sky-400/30 bg-sky-400/10 text-sky-400",
    },
    estimated: {
      label: t("calendar.dsEstimated"),
      description: t("calendar.dsEstimatedDesc"),
      className: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    },
    manual: {
      label: t("calendar.dsManual"),
      description: t("calendar.dsManualDesc"),
      className: "border-rose-400/30 bg-rose-400/10 text-rose-400",
    },
  };

  const confidenceLabel = event.dataConfidence === "confirmed" ? t("calendar.dsConfirmed") : t("calendar.dsEstimated");
  const confidenceClass =
    event.dataConfidence === "confirmed"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
      : "border-amber-400/30 bg-amber-400/10 text-amber-400";
  const dateTimeMeta = DATE_TIME_CLASSIFICATION_META[event.dateTimeClassification];

  return (
    <section className="glass-card mt-6 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("calendar.dataQuality")}</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.dsSource")}</p>
          <p className="mt-1 text-sm text-white/80 light:text-slate-700">{event.series.sourceName}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.dsLastUpdated")}</p>
          <p className="mt-1 text-sm text-white/80 light:text-slate-700">{formatTimestamp(event.updatedAt)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.dsConfidence")}</p>
          <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${confidenceClass}`}>{confidenceLabel}</span>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.dsFreq")}</p>
          <p className="mt-1 text-sm text-white/80 light:text-slate-700">{getReleaseFrequencyLabel(event.series.slug, event.series.cadence)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.dsNextExpected")}</p>
          <p className="mt-1 text-sm text-white/80 light:text-slate-700">
            {formatDateOnly(nextExpectedRelease.date)}
            {nextExpectedRelease.isEstimated && <span className="ml-1.5 text-white/30 light:text-slate-400">({t("calendar.dsEstimated").toLowerCase()})</span>}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">{t("calendar.dsDateTime")}</p>
          <span title={dateTimeMeta.description} className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${dateTimeMeta.className}`}>
            {dateTimeMeta.label}
          </span>
        </div>
      </div>
    </section>
  );
}
