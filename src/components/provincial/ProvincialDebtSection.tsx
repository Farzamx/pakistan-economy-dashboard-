"use client";

import type { ProvincialDebtSnapshot } from "@/lib/provincial/provincialDebtInsights";
import InfoTooltip from "@/components/InfoTooltip";

interface ProvincialDebtSectionProps {
  snapshot: ProvincialDebtSnapshot;
  provinceName: string;
}

export default function ProvincialDebtSection({ snapshot, provinceName }: ProvincialDebtSectionProps) {
  return (
    <section className="glass-card flex flex-col gap-5 rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white light:text-slate-900 sm:text-xl">
          {provinceName} Debt Intelligence
        </h3>
        <InfoTooltip termKey="provincial-debt-servicing" size="sm" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/5 light:border-slate-100 bg-white/[0.02] light:bg-slate-50 p-4">
          <p className="text-xs text-white/50 light:text-slate-500">Debt Servicing</p>
          <p className="mt-1 text-2xl font-semibold text-white light:text-slate-900">
            {snapshot.debtServicing === null ? "—" : `Rs ${snapshot.debtServicing.toFixed(1)}bn`}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 light:border-slate-100 bg-white/[0.02] light:bg-slate-50 p-4">
          <p className="text-xs text-white/50 light:text-slate-500">YoY Change</p>
          <p className="mt-1 text-2xl font-semibold text-white light:text-slate-900">
            {snapshot.debtServicingYoyPct === null ? "—" : `${snapshot.debtServicingYoyPct >= 0 ? "+" : ""}${snapshot.debtServicingYoyPct.toFixed(1)}%`}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 light:border-slate-100 bg-white/[0.02] light:bg-slate-50 p-4">
          <p className="text-xs text-white/50 light:text-slate-500">Debt Per Citizen</p>
          <p className="mt-1 text-2xl font-semibold text-white light:text-slate-900">
            {snapshot.debtPerCitizen === null ? "—" : `Rs ${snapshot.debtPerCitizen.toFixed(0)}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {snapshot.comparisons.map((c) => (
          <div key={c.label} className="flex items-center justify-between rounded-lg border border-white/5 light:border-slate-100 px-4 py-2.5 text-sm">
            <span className="text-white/70 light:text-slate-600">{c.label}</span>
            <span className="font-semibold text-white light:text-slate-900">
              {c.ratio === null ? "Not comparable — figure unavailable" : `${c.ratio.toFixed(2)}×`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
