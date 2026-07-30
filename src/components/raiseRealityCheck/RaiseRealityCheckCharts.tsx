"use client";

import dynamic from "next/dynamic";
import type { RaiseRealityCheckResult } from "@/lib/decisionSupportLab/salaryEngine";

const RaiseRealityCheckChartsInner = dynamic(() => import("@/components/raiseRealityCheck/RaiseRealityCheckChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[160px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  result: RaiseRealityCheckResult;
}

export default function RaiseRealityCheckCharts({ result }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <RaiseRealityCheckChartsInner result={result} />
    </div>
  );
}
