"use client";

import dynamic from "next/dynamic";
import type { CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";

const CompoundInterestChartsInner = dynamic(() => import("@/components/compoundInterest/CompoundInterestChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[240px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  principal: number;
  ratePct: number;
  years: number;
  frequency: CompoundingFrequency;
}

export default function CompoundInterestCharts(props: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <CompoundInterestChartsInner {...props} />
    </div>
  );
}
