"use client";

import dynamic from "next/dynamic";
import type { GoalTimelinePoint } from "@/lib/decisionSupportLab/goalEngine";

const GoalFundingGapChartInner = dynamic(() => import("@/components/decisionSupportLab/GoalFundingGapChartInner"), {
  ssr: false,
  loading: () => <div className="flex h-[280px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  points: GoalTimelinePoint[];
}

export default function GoalFundingGapChart({ points }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">Projected Balance vs. Target</h3>
      <GoalFundingGapChartInner points={points} />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50 light:text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded bg-[#4ade80]" /> Projected Balance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded bg-[#f59e0b]" style={{ borderTop: "2px dashed #f59e0b", background: "none" }} /> Inflation-Adjusted Target
        </span>
      </div>
    </div>
  );
}
