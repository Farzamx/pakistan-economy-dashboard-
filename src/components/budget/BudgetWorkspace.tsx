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

interface BudgetWorkspaceProps {
  years: BudgetYearRecord[];
}

const DEFAULT_FIELDS: BudgetTrendField[] = ["debtServicing", "defence", "federalPsdp", "subsidies"];

const KPI_FIELDS: { label: string; field: BudgetTrendField }[] = [
  { label: "Total Outlay", field: "totalOutlay" },
  { label: "FBR Revenue", field: "fbrTaxRevenue" },
  { label: "PSDP", field: "federalPsdp" },
  { label: "Defence", field: "defence" },
  { label: "Debt Servicing", field: "debtServicing" },
  { label: "Subsidies", field: "subsidies" },
  { label: "Provincial Transfers", field: "provincialTransfer" },
  { label: "Fiscal Deficit", field: "fiscalDeficitRs" },
];

export default function BudgetWorkspace({ years }: BudgetWorkspaceProps) {
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
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Budget Workshop</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Pakistan&apos;s federal budget, FY2010-11 through FY2026-27 — every figure traced back to that year&apos;s own official Budget in Brief, Budget Estimate only. No revised or actual figures are mixed in.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          Fiscal Year
          <Dropdown
            label="Fiscal Year"
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
            title="Debt Servicing Share of Budget"
            valueRs={debtShare.valueRs}
            subValue={`${debtShare.pctOfBudget.toFixed(0)}% of Budget`}
            yoy={getYoyChange("debtServicing", yearRecord, prevYearRecord)}
            fiscalYear={yearRecord.fiscalYear}
            highlight
          />
        )}
      </section>

      {/* Allocation breakdown */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Where Does the Budget Go?</h2>
          <p className="text-sm text-[var(--text-muted)]">FY{yearRecord.fiscalYear} federal budget allocation by major category.</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <BudgetAllocationChart data={allocation} />
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Source: Budget in Brief, FY{yearRecord.fiscalYear} Budget Estimate. &quot;Other&quot; includes Grants &amp; Transfers, Running of Civil Government, Net Lending, and contingency provisions.
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
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Historical Budget Explorer</h2>
          <p className="text-sm text-[var(--text-muted)]">FY2010-11 through FY2026-27 — select one or more categories to compare.</p>
        </div>
        <BudgetControls selectedFields={fields} onFieldsChange={setFields} mode={mode} onModeChange={setMode} />
        <div className="glass-card flex flex-col gap-4 rounded-2xl p-5">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => trendChartRef.current && exportChartAsPng(trendChartRef.current, "pakistan-budget-trend.png", "#05060f")}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              PNG
            </button>
            <button
              type="button"
              onClick={() => exportTrendAsCsv(trendPoints, fieldLabels, "pakistan-budget-trend.csv")}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              CSV
            </button>
          </div>
          <div ref={trendChartRef}>
            <BudgetTrendChart points={trendPoints} fields={fields} mode={mode} />
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">Source: Budget in Brief, each fiscal year&apos;s own Budget Estimate.</p>
        </div>
      </section>

      {/* Insights */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Budget Insights</h2>
        <BudgetInsightsPanel insights={insights} title="" />
      </section>

      {/* Category detail links */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Explore by Category</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BUDGET_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/budget/${cat.slug}`}
              className="glass-card flex flex-col gap-1 rounded-xl p-4 transition-colors hover:border-neon-blue/30"
            >
              <span className="text-sm font-semibold text-[var(--text-primary)]">{cat.shortTitle}</span>
              <span className="text-xs text-[var(--text-muted)]">{cat.description}</span>
              {cat.disclaimer && <span className="mt-1 text-[10px] text-amber-400">* Federal only — see disclaimer</span>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
