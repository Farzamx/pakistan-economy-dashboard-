"use client";

import { motion } from "framer-motion";
import KpiCard from "@/components/KpiCard";
import type { Kpi } from "@/data/kpiData";

// PEIC v2: KpiCard shrank from a decorative-glow tile to a dense
// institutional card, so the grid escalates further per breakpoint (up to
// 6 columns at 2xl instead of capping at 5) and uses a tighter gap — more
// information visible per screen, matching the "increase data density"
// direction of the redesign.
const XL_COLS: Record<number, string> = {
  3: "xl:grid-cols-3 2xl:grid-cols-4",
  4: "xl:grid-cols-4 2xl:grid-cols-5",
  5: "xl:grid-cols-5 2xl:grid-cols-6",
};

// Each card self-animates with whileInView (direct values, not variant propagation).
// This matches the pattern used by ViewportFadeIn/HealthScoreCard/DashboardSection
// which are confirmed to work correctly in Framer Motion v12.
export default function KpiGrid({ items, cols = 5 }: { items: Kpi[]; cols?: 3 | 4 | 5 }) {
  const xlClass = XL_COLS[cols] ?? "xl:grid-cols-5 2xl:grid-cols-6";
  return (
    <section className={`mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${xlClass}`}>
      {items.map((kpi, i) => (
        <motion.div
          key={`${i}-${kpi.title}`}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(i * 0.05, 0.4) }}
        >
          <KpiCard {...kpi} />
        </motion.div>
      ))}
    </section>
  );
}
