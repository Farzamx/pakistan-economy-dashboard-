"use client";

import { motion } from "framer-motion";
import AnimatedValue from "@/components/AnimatedValue";
import type { YoyChange } from "@/lib/budget/budgetData";

interface BudgetKpiCardProps {
  title: string;
  valueRs: number | null;
  /** Optional secondary line under the value, e.g. "46% of Budget". */
  subValue?: string;
  yoy: YoyChange | null;
  fiscalYear: string;
  highlight?: boolean;
}

/** Bare numeric string only — no "Rs" prefix or unit suffix, since AnimatedValue infers decimal places from this string's own length and a trailing unit character (e.g. "4.09T") would corrupt that count. The unit is rendered separately. */
function formatRsNumeric(value: number): string {
  if (Math.abs(value) >= 1000) return (value / 1000).toFixed(2);
  return value.toFixed(0);
}

function TrendArrow({ direction }: { direction: YoyChange["direction"] }) {
  if (direction === "flat") return <span className="text-white/40 light:text-slate-400">→</span>;
  const isUp = direction === "up";
  return (
    <svg
      className={`h-3 w-3 ${isUp ? "text-emerald-400 light:text-emerald-600" : "text-rose-400 light:text-rose-600"}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      {isUp ? <path d="M6 2 L10 8 L2 8 Z" /> : <path d="M6 10 L2 4 L10 4 Z" />}
    </svg>
  );
}

export default function BudgetKpiCard({ title, valueRs, subValue, yoy, fiscalYear, highlight }: BudgetKpiCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`glass-card flex h-full flex-col gap-3 p-6 ${highlight ? "border-neon-purple/40 shadow-[0_0_28px_rgba(168,85,247,0.25)]" : ""}`}
    >
      <span className="text-sm font-medium text-white/60 light:text-slate-500">{title}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-white light:text-slate-900">
          {valueRs === null ? "—" : <AnimatedValue value={formatRsNumeric(valueRs)} />}
        </span>
        <span className="text-sm text-white/50 light:text-slate-400">
          {valueRs !== null && Math.abs(valueRs) >= 1000 ? "T PKR" : "bn PKR"}
        </span>
      </div>
      {subValue && (
        <span className={`text-sm font-semibold ${highlight ? "text-neon-purple" : "text-white/70 light:text-slate-600"}`}>
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
        FY{fiscalYear} Budget Estimate · Budget in Brief
      </span>
    </motion.div>
  );
}
