import KpiCard from "@/components/KpiCard";
import TrendLineChart from "@/components/charts/TrendLineChart";
import BudgetKpiCard from "@/components/budget/BudgetKpiCard";
import SectionReveal from "@/components/marketing/SectionReveal";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getAllFiscalYears, getYearRecord, getPreviousYearRecord, getYoyChange } from "@/lib/budget/budgetData";
import type { SbpIndicatorResult } from "@/lib/data/sbp";

/**
 * Real, live embeds of three actual app components inside a CSS-drawn
 * device frame — not screenshots, not replicas (unlike the Economic
 * Identity form in the previous section, these three have no per-keystroke
 * write path, so there's no reason to fake them).
 *
 * KpiCard and TrendLineChart use the exact CPI/Policy Rate data this same
 * page already fetched for the hero tape (SbpIndicatorResult passed down
 * as props — no second fetch). BudgetKpiCard uses the real, static federal
 * budget dataset every /budget page already reads (budgetData.ts has no
 * live fetch of its own — Budget in Brief is a PDF published once a year).
 *
 * KpiCard's "Learn more" link (rendered whenever its title has a
 * KPI_SEO_SLUG entry — every real title does) calls useLanguage()'s t() for
 * its label. The marketing routes deliberately don't mount the app's
 * LanguageProvider (see AppShell.tsx — it's part of the provider stack
 * that was costing the hero its LCP budget), so without a provider here
 * that label would render as the literal untranslated key. A small, local
 * LanguageProvider scoped to just this device frame (not the app-wide one)
 * fixes it correctly rather than stripping the link or faking the text.
 */
export default function InsidePlatformSection({ cpi, policyRate }: { cpi: SbpIndicatorResult; policyRate: SbpIndicatorResult }) {
  const cpiKpi = { ...cpi.kpi, sparkline: cpi.trend.slice(-12).map((p) => p.value) };

  const fiscalYears = getAllFiscalYears();
  const latestFiscalYear = fiscalYears[fiscalYears.length - 1];
  const yearRecord = latestFiscalYear ? getYearRecord(latestFiscalYear) : undefined;
  const previousYearRecord = latestFiscalYear ? getPreviousYearRecord(latestFiscalYear) : undefined;
  const debtServicingYoy = yearRecord ? getYoyChange("debtServicing", yearRecord, previousYearRecord) : null;

  return (
    <section className="mkt-content-scrim mx-auto w-full max-w-[1200px] px-5 py-16 min-[1024px]:px-10 min-[1024px]:py-24">
      <SectionReveal className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
            Inside the platform
          </span>
          <h2 className="text-[28px] font-bold leading-tight min-[1024px]:text-[36px]" style={{ fontFamily: "var(--font-marketing-heading)", color: "var(--paper)" }}>
            Real components, real data
          </h2>
          <p className="max-w-[60ch] text-[15px] leading-relaxed min-[1024px]:text-[16px]" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}>
            These are the actual indicator card, chart and budget panel from the platform itself — not screenshots — rendered here in a read-only preview.
          </p>
        </div>

        {/* CSS-drawn device frame — a plain browser-window chrome, no image file. */}
        <div className="mx-auto w-full max-w-[820px] overflow-hidden rounded-xl border shadow-2xl" style={{ borderColor: "var(--ink-raised)", background: "var(--ink)" }}>
          <div className="flex items-center gap-1.5 border-b px-4 py-3" style={{ borderColor: "var(--ink-raised)" }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--ink-raised)" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--ink-raised)" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--ink-raised)" }} />
            <span className="ml-3 text-[11px]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
              pakeconintel.com/overview
            </span>
          </div>

          <div className="pointer-events-none grid grid-cols-1 gap-4 p-5 min-[640px]:grid-cols-2">
            <LanguageProvider>
              <KpiCard {...cpiKpi} />
            </LanguageProvider>

            <div className="glass-card-raised rounded-xl p-4">
              <p className="mb-2 text-xs font-medium text-white/40">SBP Policy Rate — Trend</p>
              <TrendLineChart data={policyRate.trend} color="#fbbf24" unit="%" gradientId="mkt-preview-policy-rate" />
            </div>

            {yearRecord && (
              <div className="min-[640px]:col-span-2">
                <BudgetKpiCard
                  title="Debt Servicing"
                  valueRs={yearRecord.debtServicing}
                  subValue={yearRecord.totalOutlay ? `${((yearRecord.debtServicing ?? 0) / yearRecord.totalOutlay * 100).toFixed(0)}% of Budget` : undefined}
                  yoy={debtServicingYoy}
                  fiscalYear={yearRecord.fiscalYear}
                  highlight
                />
              </div>
            )}
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
