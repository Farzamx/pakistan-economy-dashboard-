"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import BudgetKpiCard from "./BudgetKpiCard";
import BudgetAllocationChart from "./BudgetAllocationChart";
import BudgetAllocationBars from "./BudgetAllocationBars";
import BudgetAllocationTreemap from "./BudgetAllocationTreemap";
import BudgetRs100Card from "./BudgetRs100Card";
import BudgetControls from "./BudgetControls";
import BudgetTrendChart from "./BudgetTrendChart";
import BudgetInsightsPanel from "./BudgetInsightsPanel";
import Dropdown from "@/components/Dropdown";
import { exportChartAsPng, exportTrendAsCsv } from "@/lib/budget/exportUtils";
import {
  getAllocationDetail,
  getCategoryTrendSeries,
  getDebtServicingShare,
  getNominalGdp,
  getRs100Breakdown,
  getYoyChange,
  generateBudgetInsights,
  isFieldAvailableInMode,
  sliceYears,
  type BudgetTrendField,
  type TrendValueMode,
} from "@/lib/budget/budgetData";
import { BUDGET_CATEGORIES, BUDGET_FIELD_META } from "@/lib/budget/budgetRegistry";
import type { BudgetYearRecord } from "@/data/budgetHistorical";
import { useLanguage } from "@/components/LanguageProvider";

interface BudgetWorkspaceProps {
  years: BudgetYearRecord[];
  /** Server-rendered flow (Sankey) section, placed after the key figures. Passed in so this client component stays free of server-only data preparation. */
  flowSlot?: ReactNode;
}

const DEFAULT_FIELDS: BudgetTrendField[] = ["debtServicing", "defence", "federalPsdp", "subsidies"];

type AllocationView = "bars" | "donut" | "treemap";
const ALLOCATION_VIEWS: { view: AllocationView; label: string }[] = [
  { view: "bars", label: "Bars" },
  { view: "donut", label: "Donut" },
  { view: "treemap", label: "Treemap" },
];

/** Fields whose share of total outlay is shown under their KPI value; the others (revenue, deficit, provincial NFC share) are not components of outlay. */
const OUTLAY_SHARE_FIELDS = new Set<BudgetTrendField>(["federalPsdp", "defence", "debtServicing", "subsidies"]);

export default function BudgetWorkspace({ years, flowSlot }: BudgetWorkspaceProps) {
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
  const fiscalYears = useMemo(() => years.map((y) => y.fiscalYear), [years]);
  const latestYear = fiscalYears[fiscalYears.length - 1];
  const [selectedFy, setSelectedFy] = useState(latestYear);
  const [fields, setFields] = useState<BudgetTrendField[]>(DEFAULT_FIELDS);
  const [mode, setMode] = useState<TrendValueMode>("nominal");
  const [rangeFrom, setRangeFrom] = useState(fiscalYears[0]);
  const [rangeTo, setRangeTo] = useState(latestYear);
  const [view, setView] = useState<AllocationView>("bars");
  const trendChartRef = useRef<HTMLDivElement>(null);

  const yearIdx = years.findIndex((y) => y.fiscalYear === selectedFy);
  const yearRecord = years[yearIdx] ?? years[years.length - 1];
  const prevYearRecord = yearIdx > 0 ? years[yearIdx - 1] : undefined;

  const allocationDetail = useMemo(() => getAllocationDetail(yearRecord), [yearRecord]);
  const rs100 = useMemo(() => getRs100Breakdown(yearRecord), [yearRecord]);
  const debtShare = useMemo(() => getDebtServicingShare(yearRecord), [yearRecord]);

  // Fields that have no meaning in the chosen basis are left out of the plot (and greyed in the controls) rather than plotted on a wrong base.
  const effectiveFields = useMemo(() => {
    const ok = fields.filter((f) => isFieldAvailableInMode(f, mode));
    return ok.length > 0 ? ok : DEFAULT_FIELDS.filter((f) => isFieldAvailableInMode(f, mode));
  }, [fields, mode]);
  const rangeYears = useMemo(() => sliceYears(years, rangeFrom, rangeTo), [years, rangeFrom, rangeTo]);
  const trendPoints = useMemo(() => getCategoryTrendSeries(effectiveFields, mode, rangeYears), [effectiveFields, mode, rangeYears]);
  const insights = useMemo(() => generateBudgetInsights(years), [years]);

  const fieldLabels = useMemo(
    () => Object.fromEntries(Object.entries(BUDGET_FIELD_META).map(([k, v]) => [k, v.label])),
    [],
  );

  // Honest notes under the trend chart: which plotted years have no figure, and which use an implied GDP.
  const gapNotes = useMemo(() => {
    const notes: string[] = [];
    for (const f of effectiveFields) {
      const missing = rangeYears.filter((y) => typeof y[f] !== "number").map((y) => `FY${y.fiscalYear}`);
      if (missing.length > 0) notes.push(`${BUDGET_FIELD_META[f].label}: no figure for ${missing.join(", ")} (that year's Budget in Brief does not itemise it), so the line starts later. It is not shown as zero.`);
    }
    if (mode === "pctGdp") {
      const implied = rangeYears.filter((y) => getNominalGdp(y).basis === "implied").map((y) => y.fiscalYear);
      if (implied.length > 0) notes.push(`% of GDP uses the nominal GDP printed in Budget in Brief from FY2019-20. Before that (${implied[0]} to ${implied[implied.length - 1]}) GDP is implied from the printed deficit in rupees and as a percentage of GDP, so those years carry a rounding uncertainty of up to about ±1.4%.`);
    }
    if (mode === "nominal") notes.push("Nominal rupees at each year's own prices. Growth shown here includes inflation; it is not real growth.");
    return notes;
  }, [effectiveFields, rangeYears, mode]);

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
      <section className="flex flex-col gap-4" aria-label="Key figures">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPI_FIELDS.map(({ label, field }) => {
            const value = yearRecord[field] as number | null;
            const yoy = getYoyChange(field, yearRecord, prevYearRecord);
            let sub: string | undefined;
            if (value !== null && OUTLAY_SHARE_FIELDS.has(field) && yearRecord.totalOutlay > 0) sub = `${((value / yearRecord.totalOutlay) * 100).toFixed(1)}% of total outlay`;
            if (field === "fiscalDeficitRs") sub = `${yearRecord.fiscalDeficitPctGdp}% of GDP (as printed)`;
            return <BudgetKpiCard key={field} title={label} valueRs={value} subValue={sub} yoy={yoy} fiscalYear={yearRecord.fiscalYear} />;
          })}
        </div>

        {debtShare && (
          <BudgetKpiCard
            title={t("budget.debtShare")}
            valueRs={debtShare.valueRs}
            subValue={`${debtShare.pctOfBudget.toFixed(0)}% of total outlay · ${debtShare.pctOfEnvelope.toFixed(0)}% of the wider budget envelope`}
            yoy={getYoyChange("debtServicing", yearRecord, prevYearRecord)}
            fiscalYear={yearRecord.fiscalYear}
            highlight
          />
        )}
        {!debtShare && (
          <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 text-xs text-[var(--text-muted)]">
            FY{yearRecord.fiscalYear}&apos;s Budget in Brief does not itemise debt servicing, pension or grants (they sit inside General Public Service), so those cards show no figure rather than zero.
          </p>
        )}
      </section>

      {/* Flow of money: revenue and borrowing to spending */}
      {flowSlot}

      {/* Allocation breakdown */}
      <section className="flex flex-col gap-4" aria-labelledby="alloc-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="alloc-h" className="text-lg font-semibold text-[var(--text-primary)]">{t("budget.allocationTitle")}</h2>
            <p className="text-sm text-[var(--text-muted)]">{t("budget.whereDoesGoDesc")}</p>
          </div>
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1" role="group" aria-label="Allocation chart type">
            {ALLOCATION_VIEWS.map((v) => (
              <button
                key={v.view}
                type="button"
                aria-pressed={view === v.view}
                onClick={() => setView(v.view)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${view === v.view ? "bg-neon-blue/15 text-neon-blue" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-xs text-[var(--text-muted)]">
            <span>
              FY{yearRecord.fiscalYear} budget envelope: <span className="font-semibold text-[var(--text-primary)]">Rs {allocationDetail.envelope.toLocaleString("en-US", { maximumFractionDigits: 0 })}bn</span> (total outlay Rs {yearRecord.totalOutlay.toLocaleString("en-US")}bn + provincial transfers Rs {yearRecord.provincialTransfer.toLocaleString("en-US")}bn)
            </span>
          </div>
          {view === "bars" && <BudgetAllocationBars data={allocationDetail.slices} fiscalYear={yearRecord.fiscalYear} />}
          {view === "donut" && <BudgetAllocationChart data={allocationDetail.slices} />}
          {view === "treemap" && <BudgetAllocationTreemap key={yearRecord.fiscalYear} data={allocationDetail.slices} />}
          {allocationDetail.notes.map((n) => (
            <p key={n} className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-2.5 text-[11px] text-amber-200 light:text-amber-800">{n}</p>
          ))}
          {allocationDetail.discrepancies.map((n) => (
            <p key={n} className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] p-2.5 text-[11px] text-rose-200 light:text-rose-800">Does not reconcile: {n}</p>
          ))}
          <p className="mt-3 text-[11px] text-[var(--text-muted)]">
            Percentages are shares of the budget envelope: total outlay plus the provinces&apos; NFC share, which Budget in Brief deducts on the revenue side and does not count in total outlay. {t("budget.sourceNote")}
          </p>
          <details className="mt-1 text-[11px] text-[var(--text-muted)]" data-testid="budget-allocation-more">
            <summary className="cursor-pointer select-none text-[var(--text-secondary)] hover:text-[var(--text-primary)]">What &ldquo;Other&rdquo; holds, and the FY2010-11 caveat</summary>
            <p className="mt-1">
              &ldquo;Other&rdquo; is the remainder: grants and transfers, running of civil government, net lending and contingency provisions. In FY2010-11 interest and pension are not itemised, so the bundled slice holds them together with that remainder.{view === "bars" ? " Bar length is relative to the largest slice." : ""}
            </p>
          </details>
        </div>
      </section>

      {/* Rs100 visualization */}
      <section>
        <BudgetRs100Card data={rs100} fiscalYear={yearRecord.fiscalYear} />
      </section>

      {/* Historical Explorer */}
      <section className="flex flex-col gap-4" aria-labelledby="trend-h">
        <div>
          <h2 id="trend-h" className="text-lg font-semibold text-[var(--text-primary)]">{t("budget.historicalExplorer")}</h2>
          <p className="text-sm text-[var(--text-muted)]">{t("budget.historicalExplorerDesc")}</p>
        </div>
        <BudgetControls
          selectedFields={fields}
          onFieldsChange={setFields}
          mode={mode}
          onModeChange={setMode}
          fiscalYears={fiscalYears}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          onRangeChange={(a, b) => {
            setRangeFrom(a);
            setRangeTo(b);
          }}
        />
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
            <BudgetTrendChart points={trendPoints} fields={effectiveFields} mode={mode} />
          </div>
          {rangeYears.length === 0 && <p className="text-xs text-rose-400">No fiscal years in the selected range.</p>}
          <ul className="flex flex-col gap-1 text-[11px] text-[var(--text-muted)]">
            {gapNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
            <li>{t("budget.sourceNote")}</li>
          </ul>
          <details className="text-[11px] text-[var(--text-muted)]">
            <summary className="cursor-pointer select-none hover:text-[var(--text-secondary)]">View as a table</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-right tabular-nums">
                <thead>
                  <tr className="text-[var(--text-secondary)]">
                    <th scope="col" className="py-1 pr-3 text-left font-medium">Fiscal year</th>
                    {effectiveFields.map((f) => (
                      <th key={f} scope="col" className="px-2 py-1 font-medium">{BUDGET_FIELD_META[f].label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trendPoints.map((p) => (
                    <tr key={p.fiscalYear} className="border-t border-[var(--border-subtle)]">
                      <th scope="row" className="py-1 pr-3 text-left font-normal">FY{p.fiscalYear}</th>
                      {effectiveFields.map((f) => {
                        const v = p.values[f];
                        return <td key={f} className="px-2 py-1">{v === null || v === undefined ? "—" : mode === "nominal" ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : `${v.toFixed(2)}%`}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </section>

      {/* Insights */}
      <section className="flex flex-col gap-4" aria-labelledby="insights-h">
        <div>
          <h2 id="insights-h" className="text-lg font-semibold text-[var(--text-primary)]">{t("budget.budgetInsights")}</h2>
          <p className="text-sm text-[var(--text-muted)]">Each statement is computed by a fixed rule from the dataset; open &ldquo;Show the figures behind this&rdquo; to reproduce it. Nothing here is written by AI.</p>
        </div>
        <BudgetInsightsPanel insights={insights} title="" />
      </section>

      {/* Category detail links */}
      <section className="flex flex-col gap-4" aria-labelledby="cats-h">
        <h2 id="cats-h" className="text-lg font-semibold text-[var(--text-primary)]">{t("budget.exploreByCategory")}</h2>
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
