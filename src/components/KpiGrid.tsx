"use client";

import { motion } from "framer-motion";
import KpiCard from "@/components/KpiCard";
import type { Kpi } from "@/data/kpiData";

// Staggers the entrance of each KPI card. KpiCard defines the matching
// "hidden"/"visible" variant for its own animation.
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const XL_COLS: Record<number, string> = {
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
};

export default function KpiGrid({ items, cols = 5 }: { items: Kpi[]; cols?: 3 | 4 | 5 }) {
  const xlClass = XL_COLS[cols] ?? "xl:grid-cols-5";
  return (
    <motion.section
      className={`mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${xlClass}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={containerVariants}
    >
      {items.map((kpi, i) => (
        <KpiCard key={`${i}-${kpi.title}`} {...kpi} />
      ))}
    </motion.section>
  );
}
