"use client";

import dynamic from "next/dynamic";
import type { ProjectionYearPoint } from "@/lib/decisionSupportLab/purchasingPowerEngine";

const FutureSalaryProjectionChartsInner = dynamic(() => import("@/components/futureSalaryProjection/FutureSalaryProjectionChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[280px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  series: ProjectionYearPoint[];
}

export default function FutureSalaryProjectionCharts({ series }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <FutureSalaryProjectionChartsInner series={series} />
    </div>
  );
}
