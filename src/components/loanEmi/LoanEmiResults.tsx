"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { AmortizationSchedule } from "@/lib/decisionSupportLab/timeValueEngine";

interface Props {
  schedule: AmortizationSchedule;
}

function KpiTile({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" | "neutral" }) {
  const toneColor = tone === "up" ? "text-rose-400" : tone === "down" ? "text-emerald-400" : "text-white light:text-slate-900";
  return (
    <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
      <span className="text-label text-white/40 light:text-slate-400">{label}</span>
      <span className={`text-metric text-mono-num tabular-nums ${toneColor}`}>{value}</span>
    </div>
  );
}

export default function LoanEmiResults({ schedule }: Props) {
  const { t } = useLanguage();
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{t("loanEmi.resultsTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile label={t("loanEmi.paymentLabel")} value={fmt(schedule.payment)} />
        <KpiTile label={t("loanEmi.totalInterestLabel")} value={fmt(schedule.totalInterest)} tone="up" />
        <KpiTile label={t("loanEmi.totalPrincipalLabel")} value={fmt(schedule.totalPrincipal)} />
      </div>

      <div className="glass-card overflow-x-auto rounded-xl p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-white light:text-slate-900">{t("loanEmi.amortizationTitle")}</h3>
        <div className="max-h-[420px] overflow-y-auto">
          <table className="text-mono-num w-full min-w-[480px] text-sm tabular-nums">
            <thead className="sticky top-0 bg-[var(--surface,#0b0e21)]">
              <tr className="text-left text-xs text-white/40 light:text-slate-400">
                <th className="py-1.5 pr-4 font-medium">{t("loanEmi.periodColumn")}</th>
                <th className="py-1.5 pr-4 font-medium">{t("loanEmi.paymentColumn")}</th>
                <th className="py-1.5 pr-4 font-medium">{t("loanEmi.principalColumn")}</th>
                <th className="py-1.5 pr-4 font-medium">{t("loanEmi.interestColumn")}</th>
                <th className="py-1.5 font-medium">{t("loanEmi.balanceColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.rows.map((row) => (
                <tr key={row.period} className="text-white/70 light:text-slate-600">
                  <td className="py-1.5 pr-4">{row.period}</td>
                  <td className="py-1.5 pr-4">{fmt(row.payment)}</td>
                  <td className="py-1.5 pr-4">{fmt(row.principalPaid)}</td>
                  <td className="py-1.5 pr-4">{fmt(row.interestPaid)}</td>
                  <td className="py-1.5">{fmt(row.remainingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
