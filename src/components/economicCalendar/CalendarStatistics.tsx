"use client";

import { motion } from "framer-motion";
import type { CalendarKpis } from "@/lib/economicCalendar/economicCalendarData";

interface KpiTileProps {
  label: string;
  value: number;
  accent: string;
}

function KpiTile({ label, value, accent }: KpiTileProps) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="glass-card flex flex-col gap-1.5 p-5">
      <span className="text-xs font-medium text-white/50 light:text-slate-500">{label}</span>
      <span className="text-3xl font-bold" style={{ color: accent }}>
        {value}
      </span>
    </motion.div>
  );
}

/** Summary counts — extracted out of the Hero so they sit below the actual economic information (Recent Releases, Current Week, Remaining This Month) rather than above it. Useful context, not the first thing an investor needs to see. */
export default function CalendarStatistics({ kpis }: { kpis: CalendarKpis }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/40 light:text-slate-500">Calendar Statistics</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Upcoming Events" value={kpis.upcomingCount} accent="#38bdf8" />
        <KpiTile label="High Impact Events" value={kpis.highImpactCount} accent="#fb7185" />
        <KpiTile label="Current Week" value={kpis.thisWeekCount} accent="#34d399" />
        <KpiTile label="Remaining This Month" value={kpis.remainingThisMonthCount} accent="#a855f7" />
      </div>
    </section>
  );
}
