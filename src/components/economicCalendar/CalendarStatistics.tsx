"use client";

import { motion } from "framer-motion";
import type { CalendarKpis } from "@/lib/economicCalendar/economicCalendarData";
import { useLanguage } from "@/components/LanguageProvider";

interface KpiTileProps {
  label: string;
  value: number;
  accent: string;
}

function KpiTile({ label, value, accent }: KpiTileProps) {
  return (
    <motion.div whileHover={{ borderColor: "var(--border-emphasis)" }} transition={{ duration: 0.15, ease: "easeOut" }} className="panel-flat flex flex-col gap-1.5 p-4">
      <span className="text-xs font-medium text-white/50 light:text-slate-500">{label}</span>
      <span className="text-metric" style={{ color: accent }}>
        {value}
      </span>
    </motion.div>
  );
}

/** Summary counts — extracted out of the Hero so they sit below the actual economic information (Recent Releases, Current Week, Remaining This Month) rather than above it. Useful context, not the first thing an investor needs to see. */
export default function CalendarStatistics({ kpis }: { kpis: CalendarKpis }) {
  const { t } = useLanguage();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/40 light:text-slate-500">{t("calendar.statistics")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label={t("calendar.upcomingEvents")} value={kpis.upcomingCount} accent="#38bdf8" />
        <KpiTile label={t("calendar.highImpactEvents")} value={kpis.highImpactCount} accent="#fb7185" />
        <KpiTile label={t("calendar.currentWeek")} value={kpis.thisWeekCount} accent="#34d399" />
        <KpiTile label={t("calendar.remainingThisMonth")} value={kpis.remainingThisMonthCount} accent="#94a3b8" />
      </div>
    </section>
  );
}
