"use client";

import { motion } from "framer-motion";
import KpiCard from "@/components/KpiCard";
import type { Kpi } from "@/data/kpiData";

const XL_COLS: Record<number, string> = {
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
};

// Each card self-animates with whileInView (direct values, not variant propagation).
// This matches the pattern used by ViewportFadeIn/HealthScoreCard/DashboardSection
// which are confirmed to work correctly in Framer Motion v12.
export default function KpiGrid({ items, cols = 5 }: { items: Kpi[]; cols?: 3 | 4 | 5 }) {
  const xlClass = XL_COLS[cols] ?? "xl:grid-cols-5";
  return (
    <section className={`mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${xlClass}`}>
      {items.map((kpi, i) => (
        <motion.div
          key={`${i}-${kpi.title}`}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.08 }}
        >
          <KpiCard {...kpi} />
        </motion.div>
      ))}
    </section>
  );
}
