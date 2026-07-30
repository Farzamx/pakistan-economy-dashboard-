"use client";

import dynamic from "next/dynamic";
import type { CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";

const PresentValueChartsInner = dynamic(() => import("@/components/presentValue/PresentValueChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[240px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  presentValueAmount: number;
  discountRatePct: number;
  years: number;
  frequency: CompoundingFrequency;
}

export default function PresentValueCharts(props: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <PresentValueChartsInner {...props} />
    </div>
  );
}
