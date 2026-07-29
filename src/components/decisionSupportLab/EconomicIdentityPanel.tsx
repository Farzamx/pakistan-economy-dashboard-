"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useEconomicIdentity, setEconomicIdentity, type FilerStatus } from "@/lib/decisionSupportLab/economicIdentity";

/**
 * The Lab's one shared profile form. Every field here maps 1:1 to
 * EconomicIdentity — nothing is collected that a future tool wouldn't
 * plausibly reuse (income and spending drive Purchasing Power / Budget
 * Allocation, household size drives per-capita framing, filer status
 * drives future tax-aware tools). Saves are live (no separate Save
 * button) — same silent-persist convention as ThemeProvider/
 * LanguageProvider elsewhere in this app.
 */
export default function EconomicIdentityPanel() {
  const { t } = useLanguage();
  const identity = useEconomicIdentity();

  function numberField(value: number): string {
    return value === 0 ? "" : String(value);
  }

  return (
    <section className="glass-card rounded-xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white light:text-slate-900">{t("decisionSupportLab.identityTitle")}</h2>
      <p className="mt-1 max-w-2xl text-sm text-white/55 light:text-slate-500">{t("decisionSupportLab.identityDesc")}</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="ei-city" className="text-label text-white/40 light:text-slate-400">
            {t("decisionSupportLab.identityCity")}
          </label>
          <input
            id="ei-city"
            type="text"
            value={identity.city}
            onChange={(e) => setEconomicIdentity({ city: e.target.value })}
            placeholder={t("decisionSupportLab.identityCityPlaceholder")}
            className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
          />
        </div>

        <div>
          <label htmlFor="ei-income" className="text-label text-white/40 light:text-slate-400">
            {t("decisionSupportLab.identityIncome")}
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
            <input
              id="ei-income"
              type="number"
              inputMode="decimal"
              min={0}
              step={1000}
              value={numberField(identity.monthlyIncome)}
              placeholder="0"
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setEconomicIdentity({ monthlyIncome: isNaN(parsed) ? 0 : Math.max(0, parsed) });
              }}
              className="text-mono-num w-full bg-transparent text-sm tabular-nums text-white outline-none light:text-slate-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ei-spending" className="text-label text-white/40 light:text-slate-400">
            {t("decisionSupportLab.identitySpending")}
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
            <input
              id="ei-spending"
              type="number"
              inputMode="decimal"
              min={0}
              step={1000}
              value={numberField(identity.monthlySpending)}
              placeholder="0"
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setEconomicIdentity({ monthlySpending: isNaN(parsed) ? 0 : Math.max(0, parsed) });
              }}
              className="text-mono-num w-full bg-transparent text-sm tabular-nums text-white outline-none light:text-slate-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ei-household" className="text-label text-white/40 light:text-slate-400">
            {t("decisionSupportLab.identityHousehold")}
          </label>
          <input
            id="ei-household"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={identity.householdSize}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              setEconomicIdentity({ householdSize: isNaN(parsed) ? 1 : Math.max(1, parsed) });
            }}
            className="text-mono-num mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 py-2.5 text-sm tabular-nums text-white outline-none focus:border-neon-blue light:text-slate-900"
          />
        </div>

        <div>
          <label htmlFor="ei-filer" className="text-label text-white/40 light:text-slate-400">
            {t("decisionSupportLab.identityFilerStatus")}
          </label>
          <select
            id="ei-filer"
            value={identity.filerStatus}
            onChange={(e) => setEconomicIdentity({ filerStatus: e.target.value as FilerStatus })}
            className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
          >
            <option value="unknown">{t("decisionSupportLab.identityFilerUnknown")}</option>
            <option value="filer">{t("decisionSupportLab.identityFilerYes")}</option>
            <option value="non-filer">{t("decisionSupportLab.identityFilerNo")}</option>
          </select>
        </div>

        <div>
          <label htmlFor="ei-currency" className="text-label text-white/40 light:text-slate-400">
            {t("decisionSupportLab.identityCurrency")}
          </label>
          <select
            id="ei-currency"
            value={identity.preferredCurrency}
            disabled
            title={t("decisionSupportLab.identityCurrencyNote")}
            className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white/60 outline-none light:text-slate-500"
          >
            <option value="PKR">PKR — {t("decisionSupportLab.identityCurrencyLabel")}</option>
          </select>
        </div>
      </div>
    </section>
  );
}
