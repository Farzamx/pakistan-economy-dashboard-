"use client";

import { motion } from "framer-motion";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import type { Rs100Slice } from "@/lib/budget/budgetData";

interface BudgetRs100CardProps {
  data: Rs100Slice[];
  fiscalYear: string;
}

export default function BudgetRs100Card({ data, fiscalYear }: BudgetRs100CardProps) {
  const prefersReducedMotion = useSafeReducedMotion();
  const sorted = [...data].sort((a, b) => b.rsPerHundred - a.rsPerHundred);

  return (
    <div className="glass-card flex flex-col gap-6 rounded-2xl border-neon-blue/20 p-6 shadow-[0_0_36px_rgba(56,189,248,0.18)] sm:p-8">
      <div>
        <h3 className="text-lg font-semibold text-white light:text-slate-900 sm:text-xl">
          Where Does Rs100 of Government Spending Go?
        </h3>
        <p className="mt-1 text-xs text-white/50 light:text-slate-500">
          FY{fiscalYear} Budget Estimate — for every Rs100 the federal government spends.
        </p>
      </div>

      {/* Stacked proportional bar */}
      <div className="flex h-10 w-full overflow-hidden rounded-xl border border-white/10 light:border-slate-200">
        {sorted.map((slice, i) => (
          <motion.div
            key={slice.label}
            initial={{ width: 0 }}
            whileInView={{ width: `${slice.rsPerHundred}%` }}
            viewport={{ once: true }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.9, delay: i * 0.08, ease: "easeOut" }}
            style={{ backgroundColor: slice.color }}
            className="flex items-center justify-center first:rounded-l-xl last:rounded-r-xl"
            title={`${slice.label}: Rs${slice.rsPerHundred}`}
          />
        ))}
      </div>

      {/* Per-category rows */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sorted.map((slice) => (
          <div key={slice.label} className="flex items-center justify-between rounded-xl border border-white/5 light:border-slate-100 bg-white/[0.02] light:bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
              <span className="text-sm text-white/75 light:text-slate-700">{slice.label}</span>
            </div>
            <span className="text-lg font-bold text-white light:text-slate-900">Rs{slice.rsPerHundred}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-white/40 light:text-slate-400">
        Source: Budget in Brief, FY{fiscalYear} Budget Estimate. Figures rounded to the nearest Rupee; rounding residue is absorbed into &quot;Other&quot;.
      </p>
    </div>
  );
}
