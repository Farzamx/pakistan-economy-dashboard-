"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import BudgetKpiCard from "./BudgetKpiCard";
import BudgetAllocationChart from "./BudgetAllocationChart";
import BudgetRs100Card from "./BudgetRs100Card";
import BudgetControls from "./BudgetControls";
import BudgetTrendChart from "./BudgetTrendChart";
import BudgetInsightsPanel from "./BudgetInsightsPanel";
import Dropdown from "@/components/Dropdown";
import { exportChartAsPng, exportTrendAsCsv } from "@/lib/budget/exportUtils";
import {
  getAllocationBreakdown,
  getCategoryTrendSeries,
  getDebtServicingShare,
  getRs100Breakdown,
  getYoyChange,
  generateBudgetInsights,
  type BudgetTrendField,
  type TrendValueMode,
} from "@/lib/budget/budgetData";
import { BUDGET_CATEGORIES, BUDGET_FIELD_META } from "@/lib/budget/budgetRegistry";
import type { BudgetYearRecord } from "@/data/budgetHistorical";
import { useLanguage } from "@/components/LanguageProvider";

interface BudgetWorkspaceProps {
  years: BudgetYearRecord[];
}

const DEFAULT_FIELDS: BudgetTrendField[] = ["debtServicing", "defence", "federalPsdp", "subsidies"];

export default function BudgetWorkspace({ years }: BudgetWorkspaceProps) {
  const { t } = useLanguage();
  const KPI_FIELDS: { label: string; field: BudgetTrendField }[] = [
    { label: t("budget.totalOutlay"), field: "totalOutlay" },
    { label: t("budget.fbr"), field: "fbrTaxRevenue" },
    { label: t("budget.psdp"), field: "federalPsdp" },
    { label: t("budget.defence"), field: "defence" },
    { label: t("budget.debtServicing"), field: "debtServicing" },
    { label: t("budget.subsidies"), field: "subsidies" },
    { label: t("budget.provincialTransfers"), field: "provincialTransfer" },
    { label: t("budget.fiscalDeficit"), field: "fiscalDeficitRs" },
  ];
  const latestYear = years[years.length - 1].fiscalYear;
  const [selectedFy, setSelectedFy] = useState(latestYear);
  const [fields, setFields] = useState<BudgetTrendField[]>(DEFAULT_FIELDS);
  const [mode, setMode] = useState<TrendValueMode>("nominal");
  const trendChartRef = useRef<HTMLDivElement>(null);

  const yearIdx = years.findIndex((y) => y.fiscalYear === selectedFy);
  const yearRecord = years[yearIdx] ?? years[years.length - 1];
  const prevYearRecord = yearIdx > 0 ? years[yearIdx - 1] : undefined;

  const allocation = useMemo(() => getAllocationBreakdown(yearRecord), [yearRecord]);
  const rs100 = useMemo(() => getRs100Breakdown(yearRecord), [yearRecord]);
  const debtShare = useMemo(() => getDebtServicingShare(yearRecord), [yearRecord]);
  const trendPoints = useMemo(() => getCategoryTrendSeries(fields, mode, years), [fields, mode, years]);
  const insights = useMemo(() => generateBudgetInsights(years), [years]);

  const fieldLabels = useMemo(
    () => Object.fromEntries(Object.entries(BUDGET_FIELD_META).map(([k, v]) => [k, v.label])),
    [],
  );

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{t("budget.workshopTitle")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">{t("budget.workshopDesc")}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          {t("budget.fiscalYear")}
          <Dropdown
            label={t("budget.fiscalYear")}
            value={selectedFy}
            onChange={setSelectedFy}
            options={years.map((y) => ({ value: y.fiscalYear, label: `FY${y.fiscalYear}` }))}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <section className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPI_FIELDS.map(({ label, field }) => {
            const value = yearRecord[field] as number | null;
            const yoy = getYoyChange(field, yearRecord, prevYearRecord);
            return <BudgetKpiCard key={field} title={label} valueRs={value} yoy={yoy} fiscalYear={yearRecord.fiscalYear} />;
          })}
        </div>

        {debtShare && (
          <BudgetKpiCard
            title={t("budget.debtShare")}
            valueRs={debtShare.valueRs}
            subValue={`${debtShare.pctOfBudget.toFixed(0)}% ${t("budget.shareOfBudget")}`}
            yoy={getYoyChange("debtServicing", yearRecord, prevYearRecord)}
            fiscalYear={yearRecord.fiscalYear}
            highlight
          />
        )}
      </section>

      {/* Allocation breakdown */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("budget.whereDoesGo")}</h2>
          <p className="text-sm text-[var(--text-muted)]">{t("budget.whereDoesGoDesc")}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <BudgetAllocationChart data={allocation} />
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            {t("budget.sourceNote")}
          </p>
        </div>
      </section>

      {/* Rs100 visualization */}
      <section>
        <BudgetRs100Card data={rs100} fiscalYear={yearRecord.fiscalYear} />
      </section>

      {/* Historical Explorer */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("budget.historicalExplorer")}</h2>
          <p className="text-sm text-[var(--text-muted)]">{t("budget.historicalExplorerDesc")}</p>
        </div>
        <BudgetControls selectedFields={fields} onFieldsChange={setFields} mode={mode} onModeChange={setMode} />
        <div className="glass-card flex flex-col gap-4 rounded-2xl p-5">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => trendChartRef.current && exportChartAsPng(trendChartRef.current, "pakistan-budget-trend.png", "#05060f")}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              {t("budget.exportPng")}
            </button>
            <button
              type="button"
              onClick={() => exportTrendAsCsv(trendPoints, fieldLabels, "pakistan-budget-trend.csv")}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              {t("budget.exportCsv")}
            </button>
          </div>
          <div ref={trendChartRef}>
            <BudgetTrendChart points={trendPoints} fields={fields} mode={mode} />
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">{t("budget.sourceNote")}</p>
        </div>
      </section>

      {/* Insights */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("budget.budgetInsights")}</h2>
        <BudgetInsightsPanel insights={insights} title="" />
      </section>

      {/* Category detail links */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("budget.exploreByCategory")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BUDGET_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/budget/${cat.slug}`}
              className="glass-card flex flex-col gap-1 rounded-xl p-4 transition-colors hover:border-neon-blue/30"
            >
              <span className="text-sm font-semibold text-[var(--text-primary)]">{cat.shortTitle}</span>
              <span className="text-xs text-[var(--text-muted)]">{cat.description}</span>
              {cat.disclaimer && <span className="mt-1 text-[10px] text-amber-400">{t("budget.federalNote")}</span>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
