"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { SectionContent } from "@/data/sectionData";
import InfoTooltip from "@/components/InfoTooltip";

interface DashboardSectionProps extends SectionContent {
  children?: ReactNode;
  /** Optional small caption + tooltip rendered between the description and the stats grid
   *  (e.g. to flag that stat values are historical averages, not live quotes). */
  statsCaption?: ReactNode;
}

export default function DashboardSection({
  id,
  title,
  description,
  stats,
  statsCaption,
  children,
}: DashboardSectionProps) {
  return (
    <motion.section
      id={id}
      className="glass-card mt-6 scroll-mt-8 p-5 sm:p-6"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h2 className="text-lg font-semibold text-white light:text-slate-900 sm:text-xl">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-sm text-white/60 light:text-slate-500">{description}</p>

      {statsCaption && <div className="mt-3">{statsCaption}</div>}

      {/* PEIC v2: stat tiles step up one elevation (.glass-card-raised) so
          they read as nested inside the section rather than flat against
          it, and the value gets real numeric weight (tabular-nums,
          text-xl) instead of the previous text-lg — this row is meant to
          be scanned at a glance, so the numbers should dominate the tile. */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card-raised p-3">
            <div className="flex items-center gap-1">
              <p className="text-label text-white/45 light:text-slate-400">{stat.label}</p>
              <InfoTooltip termKey={stat.label} size="xs" />
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums text-white light:text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {children}
    </motion.section>
  );
}
