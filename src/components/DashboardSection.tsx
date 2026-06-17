"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { SectionContent } from "@/data/sectionData";
import InfoTooltip from "@/components/InfoTooltip";

interface DashboardSectionProps extends SectionContent {
  children?: ReactNode;
}

export default function DashboardSection({
  id,
  title,
  description,
  stats,
  children,
}: DashboardSectionProps) {
  return (
    <motion.section
      id={id}
      className="glass-card mt-8 scroll-mt-8 p-6 sm:p-8"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <h2 className="text-xl font-semibold text-white light:text-slate-900 sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">{description}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.03] light:bg-slate-50 p-4"
          >
            <div className="flex items-center gap-1">
              <p className="text-xs text-white/40 light:text-slate-400">{stat.label}</p>
              <InfoTooltip termKey={stat.label} size="xs" />
            </div>
            <p className="mt-1 text-lg font-semibold text-white light:text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {children}
    </motion.section>
  );
}
