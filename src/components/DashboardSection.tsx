"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { SectionContent } from "@/data/sectionData";
import InfoTooltip from "@/components/InfoTooltip";
import { KPI_SEO_SLUG } from "@/lib/seoConfig";

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
      <h2 className="text-headline text-white light:text-slate-900">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-sm text-white/60 light:text-slate-500">{description}</p>

      {statsCaption && <div className="mt-3">{statsCaption}</div>}

      {/* PEIC v2: stat tiles step up one elevation (.glass-card-raised) so
          they read as nested inside the section rather than flat against
          it, and the value gets real numeric weight (tabular-nums,
          text-xl) instead of the previous text-lg — this row is meant to
          be scanned at a glance, so the numbers should dominate the tile. */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => {
          // PEIC v2.2 (Indicator Navigation fix): a stat tile whose value
          // corresponds to a real indicator with its own detail page should
          // navigate there, same as every KpiCard/IndicatorTable row already
          // does — looked up via the same KPI_SEO_SLUG registry, keyed by
          // `kpiTitle` when the tile's display label differs from the
          // indicator's canonical title (falls back to `label` itself,
          // which already matches for tiles like "USD / PKR").
          const seoSlug = KPI_SEO_SLUG[stat.kpiTitle ?? stat.label];
          const tileContent = (
            <>
              <div className="flex items-center gap-1">
                <p className="text-label text-white/45 light:text-slate-400">{stat.label}</p>
                <InfoTooltip termKey={stat.label} size="xs" />
              </div>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white light:text-slate-900">{stat.value}</p>
            </>
          );
          return seoSlug ? (
            <Link
              key={stat.label}
              href={`/${seoSlug}`}
              className="glass-card-raised block p-3 transition-colors hover:bg-white/[0.04] light:hover:bg-slate-50"
            >
              {tileContent}
            </Link>
          ) : (
            <div key={stat.label} className="glass-card-raised p-3">
              {tileContent}
            </div>
          );
        })}
      </div>

      {children}
    </motion.section>
  );
}
