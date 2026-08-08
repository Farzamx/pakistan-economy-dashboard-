"use client";

import dynamic from "next/dynamic";
import type { MonteCarloResult } from "@/lib/decisionSupportLab/goalProbabilityEngine";

const GoalProbabilityGaugeInner = dynamic(() => import("@/components/decisionSupportLab/GoalProbabilityGaugeInner"), {
  ssr: false,
  loading: () => <div className="flex h-[130px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  result: MonteCarloResult;
}

/** The shared Monte Carlo result card — gauge plus the P10/P50/P90 outcome range, so "51% probability" is never shown without the underlying spread of simulated outcomes it came from. */
export default function GoalProbabilityGauge({ result }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">Probability of Success</h3>
      <p className="mb-3 text-xs text-white/50 light:text-slate-500">Based on {result.trials.toLocaleString("en-US")} simulated market paths at your chosen return and volatility assumptions.</p>
      <GoalProbabilityGaugeInner successProbabilityPct={result.successProbabilityPct} />
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-[var(--border-subtle)] p-2">
          <p className="text-label text-white/40 light:text-slate-400">Weak (P10)</p>
          <p className="text-mono-num mt-0.5 text-sm font-semibold text-white light:text-slate-900">Rs {Math.round(result.p10FutureValue / 1000).toLocaleString("en-US")}k</p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] p-2">
          <p className="text-label text-white/40 light:text-slate-400">Median (P50)</p>
          <p className="text-mono-num mt-0.5 text-sm font-semibold text-white light:text-slate-900">Rs {Math.round(result.p50FutureValue / 1000).toLocaleString("en-US")}k</p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] p-2">
          <p className="text-label text-white/40 light:text-slate-400">Strong (P90)</p>
          <p className="text-mono-num mt-0.5 text-sm font-semibold text-white light:text-slate-900">Rs {Math.round(result.p90FutureValue / 1000).toLocaleString("en-US")}k</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-white/40 light:text-slate-400">Target: Rs {Math.round(result.targetAmount / 1000).toLocaleString("en-US")}k</p>
    </div>
  );
}
