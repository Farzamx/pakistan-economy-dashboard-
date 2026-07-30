"use client";

import dynamic from "next/dynamic";
import type { ProjectionYearPoint } from "@/lib/decisionSupportLab/purchasingPowerEngine";

const SavingsErosionChartsInner = dynamic(() => import("@/components/savingsErosion/SavingsErosionChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[260px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  series: ProjectionYearPoint[];
  savingsAmount: number;
}

export default function SavingsErosionCharts({ series, savingsAmount }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <SavingsErosionChartsInner series={series} savingsAmount={savingsAmount} />
    </div>
  );
}
