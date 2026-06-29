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

export default function EconomicCalendarHero({ kpis }: { kpis: CalendarKpis }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-card glow-blue relative overflow-hidden p-6 sm:p-9"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-neon-purple/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-neon-blue/20 blur-3xl" />

      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-blue">Economic Calendar</p>
      <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white light:text-slate-900 sm:text-4xl">
        Pakistan Economic{" "}
        <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">Calendar</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-white/60 light:text-slate-500 sm:text-base">
        Track upcoming economic releases, policy decisions, budget events, and key indicators that shape Pakistan&apos;s economy.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Upcoming Events" value={kpis.upcomingCount} accent="#38bdf8" />
        <KpiTile label="High Impact Events" value={kpis.highImpactCount} accent="#fb7185" />
        <KpiTile label="Current Week" value={kpis.thisWeekCount} accent="#34d399" />
        <KpiTile label="This Month" value={kpis.thisMonthCount} accent="#a855f7" />
      </div>
    </motion.section>
  );
}
