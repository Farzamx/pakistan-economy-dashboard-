"use client";

import dynamic from "next/dynamic";

const InflationDragAnalyzerChartsInner = dynamic(() => import("@/components/inflationDragAnalyzer/InflationDragAnalyzerChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[260px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  startingWealth: number;
  endingWealth: number;
  realValue: number;
}

export default function InflationDragAnalyzerCharts(props: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <InflationDragAnalyzerChartsInner {...props} />
    </div>
  );
}
