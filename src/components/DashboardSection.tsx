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
      className="glass-card mt-8 scroll-mt-[100px] p-6 sm:scroll-mt-[160px] sm:p-8"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h2 className="text-headline text-white light:text-slate-900">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">{description}</p>

      {statsCaption && <div className="mt-3.5">{statsCaption}</div>}

      {/* Bloomberg-register stat strip (PEIC v3) — a single hairline-divided
          row instead of individually bordered/rounded tiles, matching
          MacroSnapshot's Tier 2 treatment: denser, tabular, no card
          shadows competing with the section's own editorial title. */}
      <div className="section-divider mt-5 grid grid-cols-2 divide-x divide-[var(--border-subtle)] pt-4 sm:grid-cols-4">
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
              <p className="text-mono-num mt-1 text-lg font-semibold text-white light:text-slate-900">{stat.value}</p>
            </>
          );
          return seoSlug ? (
            <Link
              key={stat.label}
              href={`/${seoSlug}`}
              className="block px-3 py-2 transition-colors first:pl-0 hover:bg-white/[0.02] light:hover:bg-slate-50"
            >
              {tileContent}
            </Link>
          ) : (
            <div key={stat.label} className="px-3 py-2 first:pl-0">
              {tileContent}
            </div>
          );
        })}
      </div>

      {children}
    </motion.section>
  );
}
