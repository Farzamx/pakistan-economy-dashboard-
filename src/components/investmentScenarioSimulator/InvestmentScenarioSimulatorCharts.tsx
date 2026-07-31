"use client";

import dynamic from "next/dynamic";

const InvestmentScenarioSimulatorChartsInner = dynamic(() => import("@/components/investmentScenarioSimulator/InvestmentScenarioSimulatorChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[240px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  data: { name: string; realReturnPct: number; isSelected: boolean }[];
}

export default function InvestmentScenarioSimulatorCharts({ data }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <InvestmentScenarioSimulatorChartsInner data={data} />
    </div>
  );
}
