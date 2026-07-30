"use client";

import dynamic from "next/dynamic";
import type { AmortizationSchedule } from "@/lib/decisionSupportLab/timeValueEngine";

const LoanEmiChartsInner = dynamic(() => import("@/components/loanEmi/LoanEmiChartsInner"), {
  ssr: false,
  loading: () => <div className="flex h-[240px] items-center justify-center text-sm text-white/30 light:text-slate-400">…</div>,
});

interface Props {
  schedule: AmortizationSchedule;
}

export default function LoanEmiCharts({ schedule }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <LoanEmiChartsInner schedule={schedule} />
    </div>
  );
}
