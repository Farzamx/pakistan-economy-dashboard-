"use client";

import dynamic from "next/dynamic";
import type { AnnuityType } from "@/lib/decisionSupportLab/timeValueEngine";

const AnnuityChartsInner = dynamic(() => import("@/components/annuity/AnnuityChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[240px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  payment: number;
  ratePct: number;
  periods: number;
  type: AnnuityType;
}

export default function AnnuityCharts(props: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <AnnuityChartsInner {...props} />
    </div>
  );
}
