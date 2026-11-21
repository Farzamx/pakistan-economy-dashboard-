"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { AnnuityType } from "@/lib/decisionSupportLab/timeValueEngine";
import NumericInput from "@/components/inputs/NumericInput";

export type AnnuityMode = "contribution" | "target";

interface Props {
  type: AnnuityType;
  onTypeChange: (value: AnnuityType) => void;
  mode: AnnuityMode;
  onModeChange: (value: AnnuityMode) => void;
  payment: number;
  onPaymentChange: (value: number) => void;
  targetValue: number;
  onTargetValueChange: (value: number) => void;
  ratePct: number;
  onRatePctChange: (value: number) => void;
  periods: number;
  onPeriodsChange: (value: number) => void;
}

export default function AnnuityForm({ type, onTypeChange, mode, onModeChange, payment, onPaymentChange, targetValue, onTargetValueChange, ratePct, onRatePctChange, periods, onPeriodsChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card flex flex-col gap-4 rounded-xl p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="an-type" className="text-label text-white/40 light:text-slate-400">
            {t("annuity.typeLabel")}
          </label>
          <select
            id="an-type"
            value={type}
            onChange={(e) => onTypeChange(e.target.value as AnnuityType)}
            className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
          >
            <option value="ordinary">{t("annuity.typeOrdinary")}</option>
            <option value="due">{t("annuity.typeDue")}</option>
          </select>
        </div>

        <div>
          <label htmlFor="an-mode" className="text-label text-white/40 light:text-slate-400">
            {t("annuity.modeLabel")}
          </label>
          <select
            id="an-mode"
            value={mode}
            onChange={(e) => onModeChange(e.target.value as AnnuityMode)}
            className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
          >
            <option value="contribution">{t("annuity.modeContribution")}</option>
            <option value="target">{t("annuity.modeTarget")}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {mode === "contribution" ? (
          <div>
            <label htmlFor="an-payment" className="text-label text-white/40 light:text-slate-400">
              {t("annuity.paymentLabel")}
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
              <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
              <NumericInput
                id="an-payment"
                min={0}
                step={500}
                value={payment}
                placeholder={t("decisionSupportLab.placeholderPayment")}
                onValueChange={onPaymentChange}
                className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="an-target" className="text-label text-white/40 light:text-slate-400">
              {t("annuity.targetValueLabel")}
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
              <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
              <NumericInput
                id="an-target"
                min={0}
                step={10000}
                value={targetValue}
                placeholder={t("decisionSupportLab.placeholderTargetAmount")}
                onValueChange={onTargetValueChange}
                className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="an-rate" className="text-label text-white/40 light:text-slate-400">
            {t("annuity.rateLabel")}
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <NumericInput
              id="an-rate"
              step={0.1}
              value={ratePct}
              placeholder={t("decisionSupportLab.placeholderInterestRate")}
              min={-99}
              max={1000}
              onValueChange={onRatePctChange}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
            <span className="text-sm text-white/40 light:text-slate-400">%</span>
          </div>
        </div>

        <div>
          <label htmlFor="an-periods" className="text-label text-white/40 light:text-slate-400">
            {t("annuity.yearsLabel")}
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <NumericInput
              id="an-periods"
              min={1}
              max={600}
              step={1}
              value={periods}
              integer
              emptyBehavior="keep"
              onValueChange={onPeriodsChange}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
