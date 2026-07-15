"use client";

import { motion } from "framer-motion";
import AnimatedValue from "@/components/AnimatedValue";
import type { YoyChange } from "@/lib/provincial/provincialBudgetData";

interface ProvincialKpiCardProps {
  title: string;
  valueRs: number | null;
  /** Optional secondary line under the value, e.g. "13% of Budget". */
  subValue?: string;
  yoy: YoyChange | null;
  fiscalYear: string;
  sourceLabel: string;
  highlight?: boolean;
}

/** Same formatting contract as BudgetKpiCard's formatRsNumeric — bare numeric string, unit rendered separately so AnimatedValue's decimal-place inference isn't corrupted by a trailing unit character. */
function formatRsNumeric(value: number): string {
  if (Math.abs(value) >= 1000) return (value / 1000).toFixed(2);
  return value.toFixed(0);
}

function TrendArrow({ direction }: { direction: YoyChange["direction"] }) {
  if (direction === "flat") return <span className="text-white/40 light:text-slate-400">→</span>;
  const isUp = direction === "up";
  return (
    <svg className={`h-3 w-3 ${isUp ? "text-emerald-400 light:text-emerald-600" : "text-rose-400 light:text-rose-600"}`} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      {isUp ? <path d="M6 2 L10 8 L2 8 Z" /> : <path d="M6 10 L2 4 L10 4 Z" />}
    </svg>
  );
}

export default function ProvincialKpiCard({ title, valueRs, subValue, yoy, fiscalYear, sourceLabel, highlight }: ProvincialKpiCardProps) {
  return (
    <motion.div
      whileHover={{ borderColor: "var(--border-emphasis)" }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`panel-flat flex h-full flex-col gap-2.5 p-4 ${highlight ? "border-white/25 light:border-slate-400" : ""}`}
    >
      <span className="text-sm font-medium text-white/60 light:text-slate-500">{title}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-metric text-white light:text-slate-900">
          {valueRs === null ? "—" : <AnimatedValue value={formatRsNumeric(valueRs)} />}
        </span>
        <span className="text-sm text-white/50 light:text-slate-400">
          {valueRs !== null && Math.abs(valueRs) >= 1000 ? "T PKR" : "bn PKR"}
        </span>
      </div>
      {subValue && (
        <span className={`text-sm font-semibold ${highlight ? "text-white light:text-slate-900" : "text-white/70 light:text-slate-600"}`}>
          {subValue}
        </span>
      )}
      {yoy ? (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${yoy.direction === "up" ? "text-emerald-400 light:text-emerald-700" : yoy.direction === "down" ? "text-rose-400 light:text-rose-700" : "text-white/40"}`}>
          <TrendArrow direction={yoy.direction} />
          <span>{yoy.pct >= 0 ? "+" : ""}{yoy.pct.toFixed(1)}% YoY</span>
        </div>
      ) : (
        <span className="text-xs text-white/30 light:text-slate-400">No prior-year figure for comparison</span>
      )}
      <span className="mt-auto border-t border-white/5 light:border-slate-100 pt-2 text-[10px] text-white/40 light:text-slate-400">
        FY{fiscalYear} Budget Estimate · {sourceLabel}
      </span>
    </motion.div>
  );
}
