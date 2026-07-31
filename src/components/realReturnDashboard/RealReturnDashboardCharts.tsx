"use client";

import dynamic from "next/dynamic";

const RealReturnDashboardChartsInner = dynamic(() => import("@/components/realReturnDashboard/RealReturnDashboardChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[280px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  startingWealth: number;
  nominalWealth: number;
  afterInflationValue: number;
  realWealth: number;
}

export default function RealReturnDashboardCharts(props: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <RealReturnDashboardChartsInner {...props} />
    </div>
  );
}
