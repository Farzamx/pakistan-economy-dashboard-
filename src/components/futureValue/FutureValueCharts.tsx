"use client";

import dynamic from "next/dynamic";
import type { CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";

const FutureValueChartsInner = dynamic(() => import("@/components/futureValue/FutureValueChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[240px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  presentValueAmount: number;
  annualReturnPct: number;
  years: number;
  frequency: CompoundingFrequency;
}

export default function FutureValueCharts(props: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <FutureValueChartsInner {...props} />
    </div>
  );
}
