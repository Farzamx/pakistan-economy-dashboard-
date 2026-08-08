"use client";

import type { GoalProgressResult } from "@/lib/decisionSupportLab/goalEngine";

interface Props {
  goalName: string;
  progress: GoalProgressResult;
}

export default function WealthAccumulationPlannerResults({ goalName, progress }: Props) {
  return (
    <div className="glass-card rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white light:text-slate-900">{goalName}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${progress.isOnTrack ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}>
          {progress.isOnTrack ? "On Track" : "Behind Target"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-label text-white/40 light:text-slate-400">Target (Inflation-Adjusted)</p>
          <p className="text-mono-num mt-1 text-lg font-semibold text-white light:text-slate-900">Rs {Math.round(progress.inflatedTargetAmount).toLocaleString("en-US")}</p>
        </div>
        <div>
          <p className="text-label text-white/40 light:text-slate-400">Projected Value</p>
          <p className="text-mono-num mt-1 text-lg font-semibold text-white light:text-slate-900">Rs {Math.round(progress.projectedFutureValue).toLocaleString("en-US")}</p>
        </div>
        <div>
          <p className="text-label text-white/40 light:text-slate-400">{progress.fundingGapAmount > 0 ? "Funding Gap" : "Surplus"}</p>
          <p className={`text-mono-num mt-1 text-lg font-semibold ${progress.fundingGapAmount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            Rs {Math.round(Math.abs(progress.fundingGapAmount)).toLocaleString("en-US")}
          </p>
        </div>
        <div>
          <p className="text-label text-white/40 light:text-slate-400">Required Monthly</p>
          <p className="text-mono-num mt-1 text-lg font-semibold text-white light:text-slate-900">Rs {Math.round(progress.requiredMonthlyContributionValue).toLocaleString("en-US")}</p>
        </div>
      </div>
    </div>
  );
}
