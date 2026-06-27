"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProvinceId } from "@/data/provincialBudgetHistorical";
import {
  getProvinceYears,
  getLatestProvinceYear,
  getProvinceYearRecord,
  getPreviousProvinceYearRecord,
  getProvinceYoyChange,
  getProvincialAllocationBreakdown,
  getProvincialRs100Breakdown,
  getPerCitizenMetrics,
} from "@/lib/provincial/provincialBudgetData";
import { getProvinceMeta, PROVINCES } from "@/lib/provincial/provincialBudgetRegistry";
import { getProvincialDebtSnapshot } from "@/lib/provincial/provincialDebtInsights";
import { getSeoPagesForProvince } from "@/lib/provincial/provincialSeoPages";
import { getEstimatedPopulation } from "@/data/provincialPopulation";
import Dropdown from "@/components/Dropdown";
import ProvincialKpiCard from "./ProvincialKpiCard";
import ProvincialAllocationChart from "./ProvincialAllocationChart";
import ProvincialTreemap from "./ProvincialTreemap";
import ProvincialAllocationTable from "./ProvincialAllocationTable";
import ProvincialRs100Card from "./ProvincialRs100Card";
import OtherSpendingNote from "./OtherSpendingNote";
import ProvincialDebtSection from "./ProvincialDebtSection";
import ProvincialPerCitizenSection from "./ProvincialPerCitizenSection";
import ProvincialHistoricalExplorer from "./ProvincialHistoricalExplorer";
import InfoTooltip from "@/components/InfoTooltip";

interface ProvincialWorkspaceProps {
  province: ProvinceId;
}

type AllocationView = "donut" | "treemap" | "table";
const ALLOCATION_VIEWS: { id: AllocationView; label: string }[] = [
  { id: "donut", label: "Donut" },
  { id: "treemap", label: "Treemap" },
  { id: "table", label: "Table" },
];

export default function ProvincialWorkspace({ province }: ProvincialWorkspaceProps) {
  const meta = getProvinceMeta(province);
  const years = getProvinceYears(province);
  const latestYear = getLatestProvinceYear(province).fiscalYear;
  const [selectedFy, setSelectedFy] = useState(latestYear);
  const [allocationView, setAllocationView] = useState<AllocationView>("donut");

  const year = getProvinceYearRecord(province, selectedFy) ?? getLatestProvinceYear(province);
  const previous = getPreviousProvinceYearRecord(province, year.fiscalYear);
  const sourceLabel = `${meta.name} ${year.citations.summary.document}`;

  const allocation = getProvincialAllocationBreakdown(year);
  const rs100 = getProvincialRs100Breakdown(year);
  const debtSnapshot = getProvincialDebtSnapshot(province);
  const perCitizen = getPerCitizenMetrics(province, year);
  const population = getEstimatedPopulation(province, year.fiscalYear);
  const relatedSeoPages = getSeoPagesForProvince(province);

  const kpis: { title: string; field: keyof typeof year; tooltipKey?: string }[] = [
    { title: "Total Budget", field: "totalOutlay" },
    { title: "Development Budget", field: "developmentBudget", tooltipKey: "development-budget" },
    { title: "Education", field: "education" },
    { title: "Health", field: "health" },
    { title: "Agriculture", field: "agriculture" },
    { title: "Debt Servicing", field: "debtServicing", tooltipKey: "provincial-debt-servicing" },
    { title: "Federal Transfers", field: "federalTransfers", tooltipKey: "federal-transfers" },
    { title: "Own Revenue", field: "ownRevenue", tooltipKey: "own-revenue" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{meta.name} Budget Workshop</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            {`${meta.name}'s provincial budget, sourced from the ${meta.name} Finance Department's own official documents — separate from, and not merged with, the `}
            <Link href="/budget" className="text-neon-blue hover:underline">
              Federal Budget Workshop
            </Link>
            .
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

      <nav aria-label="Provincial Budget navigation" className="flex flex-wrap items-center gap-2 text-xs">
        <Link href="/provincial-budget" className="rounded-full border border-white/10 light:border-slate-200 px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
          ← All Provinces
        </Link>
        {PROVINCES.filter((p) => p.id !== province).map((p) => (
          <Link
            key={p.id}
            href={`/provincial-budget/${p.slug}`}
            className="rounded-full border border-white/10 light:border-slate-200 px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            {p.name}
          </Link>
        ))}
        <Link href="/provincial-budget/rankings" className="rounded-full border border-white/10 light:border-slate-200 px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
          Province Rankings
        </Link>
        <Link href="/provincial-budget/growth-explorer" className="rounded-full border border-white/10 light:border-slate-200 px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
          Growth Explorer
        </Link>
        <Link href="/provincial-budget/compare" className="rounded-full border border-neon-purple/30 bg-neon-purple/10 px-3 py-1.5 text-neon-purple transition-colors hover:bg-neon-purple/20">
          Compare All Provinces
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const value = year[k.field];
          const yoy = getProvinceYoyChange(k.field, year, previous);
          return (
            <div key={k.title} className="flex flex-col gap-1">
              {k.tooltipKey && (
                <div className="flex items-center gap-1.5 px-1">
                  <InfoTooltip termKey={k.tooltipKey} size="xs" />
                </div>
              )}
              <ProvincialKpiCard
                title={k.title}
                valueRs={typeof value === "number" ? value : null}
                yoy={yoy}
                fiscalYear={year.fiscalYear}
                sourceLabel={sourceLabel}
              />
            </div>
          );
        })}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Where Does {meta.name}&apos;s Budget Go?</h2>
            <p className="text-sm text-[var(--text-muted)]">FY{year.fiscalYear} provincial budget allocation by major category.</p>
          </div>
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            {ALLOCATION_VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setAllocationView(v.id)}
                aria-pressed={allocationView === v.id}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  allocationView === v.id ? "bg-neon-blue/15 text-neon-blue" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          {allocationView === "donut" && <ProvincialAllocationChart data={allocation} />}
          {allocationView === "treemap" && <ProvincialTreemap data={allocation} />}
          {allocationView === "table" && <ProvincialAllocationTable data={allocation} />}
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">Source: {sourceLabel}, FY{year.fiscalYear} Budget Estimate.</p>
          <OtherSpendingNote residualNote={year.otherResidualNote} />
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <ProvincialRs100Card data={rs100} provinceName={meta.name} fiscalYear={year.fiscalYear} sourceLabel={sourceLabel} />
        <OtherSpendingNote residualNote={year.otherResidualNote} />
      </div>

      <ProvincialDebtSection snapshot={debtSnapshot} provinceName={meta.name} />

      <ProvincialPerCitizenSection metrics={perCitizen} provinceName={meta.name} population={population} />

      <ProvincialHistoricalExplorer lockedProvince={province} />

      {year.notes && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Data Notes</p>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{year.notes}</p>
        </div>
      )}

      {relatedSeoPages.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 light:border-slate-100 pt-6 text-xs">
          <span className="text-[var(--text-muted)]">Related:</span>
          {relatedSeoPages.map((p) => (
            <Link
              key={p.slug}
              href={`/provincial-budget/${p.slug}`}
              className="rounded-full border border-white/10 light:border-slate-200 px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              {p.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
