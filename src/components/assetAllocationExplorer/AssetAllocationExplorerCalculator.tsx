"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import AssetAllocationExplorerForm, { type AllocationBucket } from "@/components/assetAllocationExplorer/AssetAllocationExplorerForm";
import AssetAllocationExplorerResults from "@/components/assetAllocationExplorer/AssetAllocationExplorerResults";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import ConfidenceBadge from "@/components/decisionSupportLab/ConfidenceBadge";
import DataFreshnessBadge from "@/components/decisionSupportLab/DataFreshnessBadge";
import SpendingCompositionDonut from "@/components/decisionSupportLab/SpendingCompositionDonut";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import {
  calculatePortfolioReturn,
  calculateDiversificationScore,
  calculatePortfolioVolatility,
  getRecommendedAllocation,
  runInvestmentScenario,
  ASSET_CORRELATIONS,
  type ScenarioAssetId,
} from "@/lib/decisionSupportLab/investmentEngine";
import { SCENARIOS } from "@/components/investmentScenarioSimulator/scenarios";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { calculateConfidenceScore } from "@/lib/decisionSupportLab/confidenceEngine";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";
import { useEconomicProfile, setInvestmentAllocationValue, replaceInvestmentAllocation } from "@/lib/decisionSupportLab/economicProfile";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import type { LiveAssetData } from "@/lib/decisionSupportLab/liveAssetData";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
  liveData: LiveAssetData;
}

const BUCKET_META: { id: ScenarioAssetId; nameKey: string; color: string }[] = [
  { id: "cash", nameKey: "decisionSupportLab.assetCash", color: "#4d8df7" },
  { id: "gold", nameKey: "decisionSupportLab.assetGold", color: "#fbbf24" },
  { id: "equities", nameKey: "decisionSupportLab.assetEquities", color: "#34d399" },
  { id: "govtSecurities", nameKey: "decisionSupportLab.assetGovtSecurities", color: "#f472b6" },
  { id: "foreignCurrency", nameKey: "decisionSupportLab.assetForeignCurrency", color: "#9b8afb" },
];

const DEFAULT_WEIGHTS: Record<ScenarioAssetId, number> = { cash: 25, gold: 20, equities: 20, govtSecurities: 25, foreignCurrency: 10 };

function returnFor(id: ScenarioAssetId, liveData: LiveAssetData): number {
  switch (id) {
    case "cash":
      return liveData.savings.nominalReturnPct ?? 0;
    case "gold":
      return liveData.gold.nominalReturnPct ?? 0;
    case "equities":
      return liveData.psx.nominalReturnPct ?? 0;
    case "govtSecurities":
      return liveData.pib.nominalReturnPct ?? 0;
    case "foreignCurrency":
      return liveData.usd.nominalReturnPct ?? 0;
  }
}

function volatilityFor(id: ScenarioAssetId, liveData: LiveAssetData): number | null {
  switch (id) {
    case "cash":
      return liveData.savings.volatilityPct;
    case "gold":
      return liveData.gold.volatilityPct;
    case "equities":
      return liveData.psx.volatilityPct;
    case "govtSecurities":
      return liveData.pib.volatilityPct;
    case "foreignCurrency":
      return liveData.usd.volatilityPct;
  }
}

// clamp(50 + realReturn × 5, 0, 100) — a 0% real return scores 50
// (neutral protection), each percentage point of real return above/below
// that shifts the score by 5, matching the scoring-band convention
// established by healthScoreEngine.ts (Phase 3).
function inflationProtectionScore(blendedRealReturnPct: number): number {
  return Math.max(0, Math.min(100, 50 + blendedRealReturnPct * 5));
}

/** Portfolio Health Summary for one allocation — reused for both the current allocation and, when active, the staged What-If allocation. */
function summarize(buckets: (AllocationBucket & { volatilityPct: number | null })[], inflationPct: number) {
  const portfolioResult = calculatePortfolioReturn(buckets.map((b) => ({ assetId: b.id, assetName: b.name, weightPct: b.weightPct, nominalReturnPct: b.nominalReturnPct })), inflationPct);
  const diversificationScore = calculateDiversificationScore(buckets.map((b) => b.weightPct));
  const volatilityPct = calculatePortfolioVolatility(buckets.map((b) => ({ assetId: b.id as ScenarioAssetId, weightPct: b.weightPct, volatilityPct: b.volatilityPct })));
  const protectionScore = inflationProtectionScore(portfolioResult.portfolioRealReturnPct);
  return { portfolioResult, diversificationScore, volatilityPct, protectionScore };
}

export default function AssetAllocationExplorerCalculator({ breakdown, liveData }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;

  const allocation = profile.investmentAllocation;
  const buckets: (AllocationBucket & { volatilityPct: number | null })[] = useMemo(
    () => BUCKET_META.map((meta) => ({ id: meta.id, name: t(meta.nameKey), weightPct: allocation[meta.id] ?? DEFAULT_WEIGHTS[meta.id], nominalReturnPct: returnFor(meta.id, liveData), color: meta.color, volatilityPct: volatilityFor(meta.id, liveData) })),
    [allocation, liveData, t],
  );

  function handleWeightChange(id: string, value: number) {
    setInvestmentAllocationValue(id, value);
  }

  const current = useMemo(() => summarize(buckets, inflationPct), [buckets, inflationPct]);

  // What-If: staging area for a hypothetical allocation (e.g. the
  // Recommended preset) — never written to the profile unless the visitor
  // explicitly applies it via handleAdoptWhatIf, per the Single Source of
  // Truth rule (plan §17i / §17g): a staged comparison is not the same as
  // a saved change.
  const [whatIfWeights, setWhatIfWeights] = useState<Record<ScenarioAssetId, number> | null>(null);
  const whatIfBuckets = useMemo(() => (whatIfWeights ? buckets.map((b) => ({ ...b, weightPct: whatIfWeights[b.id as ScenarioAssetId] ?? b.weightPct })) : null), [whatIfWeights, buckets]);
  const whatIf = useMemo(() => (whatIfBuckets ? summarize(whatIfBuckets, inflationPct) : null), [whatIfBuckets, inflationPct]);

  const recommended = getRecommendedAllocation(profile.riskTolerance ?? "moderate");

  function handleStageRecommended() {
    setWhatIfWeights(recommended);
  }
  function handleAdoptWhatIf() {
    if (!whatIfWeights) return;
    replaceInvestmentAllocation(whatIfWeights);
    setWhatIfWeights(null);
  }
  function handleDiscardWhatIf() {
    setWhatIfWeights(null);
  }

  const donutData = buckets.filter((b) => b.weightPct > 0).map((b) => ({ label: b.name, value: b.weightPct, color: b.color }));

  const scenarioStrip = useMemo(
    () =>
      SCENARIOS.map((s) => {
        const baseAllocations = (whatIfBuckets ?? buckets).map((b) => ({ assetId: b.id, assetName: b.name, weightPct: b.weightPct, nominalReturnPct: b.nominalReturnPct }));
        const r = runInvestmentScenario(baseAllocations, inflationPct, s);
        return { name: t(s.labelKey), realReturnPct: r.portfolioRealReturnPct };
      }),
    [buckets, whatIfBuckets, inflationPct, t],
  );

  const confidence = useMemo(
    () =>
      calculateConfidenceScore({
        profileCompletenessPct: getOverallCompletionPct(profile),
        usesOfficialData: !useCustomInflation,
        hasHistoricalCoverage: breakdown !== null,
        manualEstimateCount: 0,
        assumptionCount: (useCustomInflation ? 1 : 0) + 1, // +1 for the illustrative correlation assumption behind the volatility figure
      }),
    [profile, useCustomInflation, breakdown],
  );

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <AssetAllocationExplorerForm buckets={buckets} onWeightChange={handleWeightChange} />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <InflationRateField
          autoValuePct={officialInflationPct}
          autoLabel="Official Inflation (Latest)"
          tooltipText="Calculated automatically from the latest official CPI data."
          useCustom={useCustomInflation}
          onUseCustomChange={setUseCustomInflation}
          customValuePct={customInflationPct}
          onCustomValuePctChange={setCustomInflationPct}
        />
      </div>

      <ConfidenceBadge result={confidence} toolId="asset-allocation-explorer" />
      <DataFreshnessBadge sourceName="PEIC Investment Intelligence Engine" lastUpdated={liveData.asOfDate} dataFrequency="Daily (market data) / As published (SBP rates)" />

      <AssetAllocationExplorerResults
        blendedReturnPct={current.portfolioResult.portfolioNominalReturnPct}
        blendedRealReturnPct={current.portfolioResult.portfolioRealReturnPct}
        inflationProtectionScore={current.protectionScore}
        diversificationScore={current.diversificationScore}
        volatilityPct={current.volatilityPct}
      />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("assetAllocationExplorer.allocationChartTitle")}</h3>
        <SpendingCompositionDonut data={donutData} />
      </div>

      <div className="glass-card overflow-x-auto rounded-xl p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-white light:text-slate-900">Asset Contribution</h3>
        <table className="text-mono-num w-full min-w-[520px] text-sm tabular-nums">
          <thead>
            <tr className="text-left text-xs text-white/40 light:text-slate-400">
              <th className="py-1.5 pr-4 font-medium">Asset</th>
              <th className="py-1.5 pr-4 font-medium">Weight</th>
              <th className="py-1.5 pr-4 font-medium">Return</th>
              <th className="py-1.5 pr-4 font-medium">Contribution</th>
              <th className="py-1.5 font-medium">Volatility</th>
            </tr>
          </thead>
          <tbody>
            {current.portfolioResult.contributions.map((c) => {
              const bucket = buckets.find((b) => b.id === c.assetId);
              return (
                <tr key={c.assetId} className="border-t border-[var(--border-subtle)]">
                  <td className="py-2 pr-4 font-semibold text-white light:text-slate-900">{c.assetName}</td>
                  <td className="py-2 pr-4 text-white/70 light:text-slate-600">{c.weightPct.toFixed(0)}%</td>
                  <td className="py-2 pr-4 text-white/70 light:text-slate-600">{c.nominalReturnPct.toFixed(1)}%</td>
                  <td className="py-2 pr-4 text-white/70 light:text-slate-600">{c.contributionPct.toFixed(1)}pp</td>
                  <td className="py-2 text-white/70 light:text-slate-600">{bucket?.volatilityPct !== null && bucket?.volatilityPct !== undefined ? `${bucket.volatilityPct.toFixed(1)}%` : "— (illustrative)"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white light:text-slate-900">Recommended Allocation</h3>
            <p className="mt-1 text-xs text-white/50 light:text-slate-500">
              Based on your {profile.riskTolerance ?? "moderate (default)"} risk tolerance. Staged into What-If below — never applied automatically.
            </p>
          </div>
          <button type="button" onClick={handleStageRecommended} className="rounded-lg border border-neon-blue/40 px-3 py-1.5 text-xs font-semibold text-neon-blue transition-colors hover:bg-neon-blue/10">
            Stage as What-If
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {BUCKET_META.map((meta) => (
            <span key={meta.id} className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-white/60 light:text-slate-500">
              {t(meta.nameKey)}: {recommended[meta.id]}%
            </span>
          ))}
        </div>
      </div>

      {whatIf && whatIfBuckets && (
        <div className="glass-card rounded-xl border border-neon-blue/20 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white light:text-slate-900">What-If Comparison</h3>
            <div className="flex gap-2">
              <button type="button" onClick={handleAdoptWhatIf} className="rounded-lg bg-neon-blue px-3 py-1.5 text-xs font-semibold text-black">
                Apply to my profile
              </button>
              <button type="button" onClick={handleDiscardWhatIf} className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-white/60 light:text-slate-500">
                Discard
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Nominal Return", cur: current.portfolioResult.portfolioNominalReturnPct, next: whatIf.portfolioResult.portfolioNominalReturnPct, suffix: "%" },
              { label: "Real Return", cur: current.portfolioResult.portfolioRealReturnPct, next: whatIf.portfolioResult.portfolioRealReturnPct, suffix: "%" },
              { label: "Diversification", cur: current.diversificationScore, next: whatIf.diversificationScore, suffix: "/100" },
              { label: "Risk (Volatility)", cur: current.volatilityPct, next: whatIf.volatilityPct, suffix: "%" },
            ].map((row) => {
              const delta = row.next - row.cur;
              return (
                <div key={row.label} className="rounded-lg border border-[var(--border-subtle)] p-2.5">
                  <p className="text-[11px] text-white/40 light:text-slate-400">{row.label}</p>
                  <p className="text-mono-num text-sm font-semibold tabular-nums text-white light:text-slate-900">
                    {row.next.toFixed(1)}
                    {row.suffix}
                  </p>
                  <p className={`text-[11px] ${delta === 0 ? "text-white/40" : delta > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${row.suffix} vs. current`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white light:text-slate-900">Scenario Comparison</h3>
          <Link href="/decision-support-lab/investment-scenario-simulator" className="text-xs font-medium text-neon-blue hover:underline">
            Full simulator →
          </Link>
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          {[...scenarioStrip].sort((a, b) => b.realReturnPct - a.realReturnPct).map((s) => (
            <div key={s.name} className="flex items-center justify-between text-sm">
              <span className="text-white/70 light:text-slate-600">{s.name}</span>
              <span className={`text-mono-num font-semibold tabular-nums ${s.realReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {s.realReturnPct >= 0 ? "+" : ""}
                {s.realReturnPct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white light:text-slate-900">Asset Correlation</h3>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">Illustrative — not computed from live data</span>
        </div>
        <p className="mt-1 text-xs text-white/50 light:text-slate-500">No return-correlation data source exists for these asset classes — these are fixed, documented assumptions used only to estimate portfolio-level risk, not a live measurement.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="text-mono-num w-full min-w-[420px] text-xs tabular-nums">
            <thead>
              <tr>
                <th className="py-1 pr-2 text-left font-medium text-white/40 light:text-slate-400"> </th>
                {BUCKET_META.map((m) => (
                  <th key={m.id} className="py-1 pr-2 text-left font-medium text-white/40 light:text-slate-400">
                    {t(m.nameKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BUCKET_META.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border-subtle)]">
                  <td className="py-1 pr-2 font-semibold text-white light:text-slate-900">{t(row.nameKey)}</td>
                  {BUCKET_META.map((col) => (
                    <td key={col.id} className="py-1 pr-2 text-white/60 light:text-slate-500">
                      {(ASSET_CORRELATIONS[row.id]?.[col.id] ?? 0).toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ExplainTheMath
        formula="Blended Return = Σ (Weight × Asset Return); Diversification = (1 − Σ Weight²) × 100; Portfolio Volatility = √ΣΣ (Wᵢ × Wⱼ × σᵢ × σⱼ × ρᵢⱼ)"
        variables={[
          { symbol: "Weight", description: "Each bucket's share of the allocation, as a percentage" },
          { symbol: "Asset Return", description: "Each bucket's nominal return — cash and government securities from live SBP rates, gold and equities from live market data" },
          { symbol: "σ (sigma)", description: "Each asset's volatility — from real price history where available, illustrative otherwise" },
          { symbol: "ρ (rho)", description: "Assumed correlation between two assets — illustrative, not computed from live data" },
        ]}
        methodology="Blended return and diversification reuse calculatePortfolioReturn() and calculateDiversificationScore() from the Investment Intelligence engine, unchanged from the original tool. Portfolio volatility is new: the standard weighted-covariance formula, applied to a fixed, documented correlation matrix since no live correlation data source exists for these asset classes."
        sourceName="PEIC Investment Intelligence Engine"
        lastUpdated={liveData.asOfDate}
        assumptions={["Assumes each bucket's current return applies for a full year at your chosen weight.", "Asset correlations are fixed, illustrative assumptions — see the Asset Correlation panel above."]}
        limitations={["Diversification score measures concentration across these 5 broad buckets only, not diversification within a bucket (e.g. which specific equities).", "Portfolio volatility is an estimate built on assumed correlations, not a live risk measurement."]}
      />

      <EducationalPanel
        whatDoesThisMean="This lets you experiment with a simple 5-bucket allocation and immediately see the trade-off between return, inflation protection, diversification and risk."
        whyDifferent="More cash feels safe but usually means a lower inflation protection score and lower expected return; more equities usually raises expected return but adds volatility — there's no allocation that maximizes every metric at once."
        howCalculated="Your blended return is the weighted average of every bucket's return; volatility blends each bucket's own risk with assumed correlations between buckets; the Recommended Allocation is a fixed preset matched to your profile's risk tolerance."
        sources={["SBP EasyData — Policy Rate, 3Y PIB Yield, USD/PKR", "Yahoo Finance — Gold, PAK ETF (Pakistan equity proxy)", "Pakistan Bureau of Statistics — National CPI Index"]}
      />

      <DecisionSupportPanel
        whatHappened={`You explored an allocation with a blended return of ${current.portfolioResult.portfolioNominalReturnPct.toFixed(1)}%, a diversification score of ${current.diversificationScore.toFixed(0)}/100, and estimated volatility of ${current.volatilityPct.toFixed(1)}%.`}
        whyItHappened="Every asset bucket trades off differently between return, inflation protection, diversification and risk — there's no single allocation that maximizes all four at once."
        whatToUnderstand="Apply what you learn here to your actual named assets and amounts in Portfolio Purchasing Power for a precise, rupee-denominated version of the same analysis."
        relatedTools={[{ title: "Portfolio Purchasing Power", href: "/decision-support-lab/portfolio-purchasing-power" }, { title: "Investment Scenario Simulator", href: "/decision-support-lab/investment-scenario-simulator" }]}
        suggestedNext={{
          title: "Stress-test this allocation against a scenario",
          href: "/decision-support-lab/investment-scenario-simulator",
          reason: "See how a market crash, inflation spike or rate change would affect a portfolio like this one.",
        }}
      />
    </div>
  );
}
