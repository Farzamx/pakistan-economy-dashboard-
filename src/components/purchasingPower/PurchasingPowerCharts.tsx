"use client";

import dynamic from "next/dynamic";
import type { PurchasingPowerResult, TimelinePoint } from "@/lib/decisionSupportLab/purchasingPowerEngine";

// Same lazy-loading rationale as PersonalInflationCharts.tsx — Recharts
// stays out of the initial bundle, fetched only once results exist.
const PurchasingPowerChartsInner = dynamic(() => import("@/components/purchasingPower/PurchasingPowerChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[400px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  result: PurchasingPowerResult;
  timeline: TimelinePoint[];
}

export default function PurchasingPowerCharts({ result, timeline }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <PurchasingPowerChartsInner result={result} timeline={timeline} />
    </div>
  );
}
