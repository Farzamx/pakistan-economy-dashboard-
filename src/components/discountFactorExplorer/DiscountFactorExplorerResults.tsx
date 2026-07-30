"use client";

import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  discountFactorValue: number;
  ratePct: number;
  years: number;
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card-raised flex flex-col gap-1.5 rounded-xl p-4 sm:p-5">
      <span className="text-label text-white/40 light:text-slate-400">{label}</span>
      <span className="text-metric text-mono-num tabular-nums text-white light:text-slate-900">{value}</span>
    </div>
  );
}

export default function DiscountFactorExplorerResults({ discountFactorValue, ratePct, years }: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiTile label={t("discountFactorExplorer.discountFactorLabel")} value={discountFactorValue.toFixed(4)} />
        <KpiTile label={t("discountFactorExplorer.presentValueMultiplierLabel")} value={`${(discountFactorValue * 100).toFixed(1)}%`} />
      </div>

      <div className="glass-card rounded-xl p-4 text-sm leading-relaxed text-white/70 sm:p-5 light:text-slate-600">
        <p>
          At a {ratePct.toFixed(1)}% discount rate, Rs 1 received {years} year{years === 1 ? "" : "s"} from now is worth Rs {discountFactorValue.toFixed(4)} today — or, put another way, every rupee of future value is worth only{" "}
          {(discountFactorValue * 100).toFixed(1)}% of its face amount today.
        </p>
      </div>
    </div>
  );
}
