"use client";

// The Decision Center (Phase 5.5 brief round 2, item 9) — replaces "profile
// complete, straight to the tool grid" with a personalized summary. Every
// figure here is computed by calling an EXISTING engine function with
// profile-derived inputs — no calculation logic is duplicated. ToolGrid
// remains one scroll away; this never removes it.
import { useMemo } from "react";
import Link from "next/link";
import { useEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import { useScenarioProfiles, getEffectiveProfile } from "@/lib/decisionSupportLab/scenarioProfiles";
import ScenarioProfileSwitcher from "@/components/decisionSupportLab/ScenarioProfileSwitcher";
import { getOverallCompletionPct, getProfileHealthChecklist } from "@/lib/decisionSupportLab/profileCompletion";
import { calculateEconomicIdentityConfidence } from "@/lib/decisionSupportLab/confidenceEngine";
import { generateRecommendations, type GoalRecommendationInput } from "@/lib/decisionSupportLab/recommendationEngine";
import { projectGoalProgress } from "@/lib/decisionSupportLab/goalEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { computeRaiseRealityCheck } from "@/lib/decisionSupportLab/salaryEngine";
import { deflateCompounding } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { calculatePortfolioReturn, type PortfolioAllocationEntry } from "@/lib/decisionSupportLab/investmentEngine";
import { computeHealthScore } from "@/lib/decisionSupportLab/healthScoreEngine";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import type { LiveAssetData } from "@/lib/decisionSupportLab/liveAssetData";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
  liveData: LiveAssetData | null;
}

function StatCard({ label, value, caption, tone }: { label: string; value: string; caption?: string; tone?: "up" | "down" | "neutral" }) {
  const toneColor = tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-white light:text-slate-900";
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <p className="text-label text-white/40 light:text-slate-400">{label}</p>
      <p className={`text-mono-num mt-1 text-xl font-semibold tabular-nums ${toneColor}`}>{value}</p>
      {caption && <p className="mt-1 text-xs text-white/45 light:text-slate-400">{caption}</p>}
    </div>
  );
}

export default function EconomicDashboard({ breakdown, liveData }: Props) {
  const { profile: rawProfile } = useEconomicProfile();
  const { activeScenarioId, scenarios } = useScenarioProfiles();
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? null;
  const profile = getEffectiveProfile(rawProfile, activeScenario);

  const officialCpiPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);
  const overallCompletionPct = getOverallCompletionPct(profile);
  const healthChecklist = getProfileHealthChecklist(profile);

  const identityConfidence = useMemo(
    () =>
      calculateEconomicIdentityConfidence(profile, {
        officialFieldCount: [profile.city, profile.monthlyIncome > 0, profile.householdSize > 0].filter(Boolean).length,
        manualFieldCount: [profile.currentInvestmentAmount > 0, profile.riskTolerance !== null].filter(Boolean).length,
        missingFieldCount: healthChecklist.filter((c) => c.status === "missing").length,
        hasHistoricalCoverage: breakdown !== null,
      }),
    [profile, breakdown, healthChecklist],
  );

  const raiseResult = useMemo(() => {
    const salary = profile.currentSalary > 0 ? profile.currentSalary : profile.monthlyIncome;
    if (salary <= 0 || profile.lastRaisePct <= 0) return null;
    return computeRaiseRealityCheck(salary, profile.lastRaisePct, officialCpiPct);
  }, [profile, officialCpiPct]);

  const savingsOneYearReal = useMemo(() => {
    if (profile.currentSavings <= 0) return null;
    return deflateCompounding(profile.currentSavings, officialCpiPct, 1);
  }, [profile.currentSavings, officialCpiPct]);

  const portfolioResult = useMemo(() => {
    if (!liveData || profile.currentInvestmentAmount <= 0 || Object.keys(profile.investmentAllocation).length === 0) return null;
    const returnByAsset: Record<string, number> = {
      gold: liveData.gold.nominalReturnPct ?? 0,
      usd: liveData.usd.nominalReturnPct ?? 0,
      savings: liveData.savings.nominalReturnPct ?? 0,
      tbill: liveData.tbill.nominalReturnPct ?? 0,
      pib: liveData.pib.nominalReturnPct ?? 0,
      psx: liveData.psx.nominalReturnPct ?? 0,
      moneyMarket: 0,
      property: 0,
    };
    const entries: PortfolioAllocationEntry[] = Object.entries(profile.investmentAllocation).map(([assetId, weightPct]) => ({
      assetId,
      assetName: assetId,
      weightPct,
      nominalReturnPct: returnByAsset[assetId] ?? 0,
    }));
    return calculatePortfolioReturn(entries, officialCpiPct);
  }, [liveData, profile.currentInvestmentAmount, profile.investmentAllocation, officialCpiPct]);

  const healthScore = useMemo(
    () =>
      computeHealthScore({
        personalCpiPct: officialCpiPct,
        hasPersonalAllocation: Object.keys(profile.householdAllocation.allocation).length > 0,
        officialCpiPct,
        monthlyIncome: profile.monthlyIncome > 0 ? profile.monthlyIncome : undefined,
        monthlySpending: profile.monthlySpending > 0 ? profile.monthlySpending : undefined,
        incomeErosionPct: undefined,
        lastRaisePct: profile.lastRaisePct > 0 ? profile.lastRaisePct : undefined,
        savingsAmount: profile.currentSavings > 0 ? profile.currentSavings : undefined,
      }),
    [profile, officialCpiPct],
  );

  const goalRecommendationInputs: GoalRecommendationInput[] = useMemo(
    () =>
      profile.goals.map((goal) => {
        const progress = projectGoalProgress(goal, { inflationPct: officialCpiPct });
        return { goal, fundingGapAmount: progress.fundingGapAmount, fundingGapPct: progress.fundingGapPct, requiredMonthlyContributionValue: progress.requiredMonthlyContributionValue };
      }),
    [profile.goals, officialCpiPct],
  );

  const recommendations = useMemo(
    () =>
      generateRecommendations(profile, {
        healthScorePct: healthScore.overallScore,
        portfolioRealReturnPct: portfolioResult?.portfolioRealReturnPct,
        officialInflationPct: officialCpiPct,
        goals: goalRecommendationInputs,
      }),
    [profile, healthScore, portfolioResult, officialCpiPct, goalRecommendationInputs],
  );

  const topRisk = recommendations.find((r) => r.frame === "risk");
  const topOpportunity = recommendations.find((r) => r.frame === "opportunity");

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white light:text-slate-900">Your Decision Center</h2>
          <p className="mt-1 text-sm text-white/55 light:text-slate-500">A live summary built from your Economic Profile and the Lab&apos;s tools.</p>
        </div>
        <ScenarioProfileSwitcher />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Economic Health" value={`${healthScore.overallScore}/100`} caption={`${healthScore.categories.filter((c) => c.available).length}/6 categories available`} tone={healthScore.overallScore >= 70 ? "up" : healthScore.overallScore >= 50 ? "neutral" : "down"} />
        <StatCard label="Profile Completion" value={`${overallCompletionPct}%`} caption="How much you've told us" />
        <StatCard label="Identity Confidence" value={`${identityConfidence.score}%`} caption="How solid the data is" tone={identityConfidence.label === "High" ? "up" : identityConfidence.label === "Low" ? "down" : "neutral"} />
        <StatCard label="Official Inflation" value={`${officialCpiPct.toFixed(1)}%`} caption={breakdown ? `As of ${breakdown.observationDate}` : "Latest release"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {topRisk && (
          <div className="glass-card rounded-xl border border-rose-400/20 p-4 sm:p-5">
            <p className="text-label text-rose-400">Biggest Financial Risk</p>
            <p className="mt-1 text-sm font-semibold text-white light:text-slate-900">{topRisk.title}</p>
            <p className="mt-1 text-xs text-white/55 light:text-slate-500">{topRisk.reason}</p>
            {topRisk.relatedToolHref && (
              <Link href={topRisk.relatedToolHref} className="mt-2 inline-block text-xs font-medium text-neon-blue hover:underline">
                Address this →
              </Link>
            )}
          </div>
        )}
        {topOpportunity && (
          <div className="glass-card rounded-xl border border-emerald-400/20 p-4 sm:p-5">
            <p className="text-label text-emerald-400">Biggest Opportunity</p>
            <p className="mt-1 text-sm font-semibold text-white light:text-slate-900">{topOpportunity.title}</p>
            <p className="mt-1 text-xs text-white/55 light:text-slate-500">{topOpportunity.reason}</p>
            {topOpportunity.relatedToolHref && (
              <Link href={topOpportunity.relatedToolHref} className="mt-2 inline-block text-xs font-medium text-neon-blue hover:underline">
                Explore this →
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {raiseResult && <StatCard label="Real Salary Growth" value={`${raiseResult.realChangePct >= 0 ? "+" : ""}${raiseResult.realChangePct.toFixed(1)}%`} caption="Last raise vs. inflation" tone={raiseResult.realChangePct >= 0 ? "up" : "down"} />}
        {savingsOneYearReal !== null && (
          <StatCard label="Savings (1yr real value)" value={`Rs ${Math.round(savingsOneYearReal).toLocaleString("en-US")}`} caption={`Of Rs ${Math.round(profile.currentSavings).toLocaleString("en-US")} today`} />
        )}
        {portfolioResult && (
          <StatCard
            label="Portfolio Real Return"
            value={`${portfolioResult.portfolioRealReturnPct >= 0 ? "+" : ""}${portfolioResult.portfolioRealReturnPct.toFixed(1)}%`}
            caption="Weighted across your allocation"
            tone={portfolioResult.portfolioRealReturnPct >= 0 ? "up" : "down"}
          />
        )}
        {profile.goals.length > 0 && <StatCard label="Goal Progress" value={`${profile.goals.length} goal${profile.goals.length === 1 ? "" : "s"}`} caption="Tracked in your profile" />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-4 sm:p-5">
          <p className="text-sm font-semibold text-white light:text-slate-900">Priority Recommendations</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {recommendations.slice(0, 3).map((rec) => (
              <li key={rec.title} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="text-white/85 light:text-slate-800">{rec.title}</p>
                  <p className="text-xs text-white/45 light:text-slate-400">{rec.reason}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${rec.expectedImpact === "high" ? "bg-rose-500/15 text-rose-300" : rec.expectedImpact === "medium" ? "bg-amber-500/15 text-amber-300" : "bg-white/10 text-white/50"}`}>
                  {rec.expectedImpact}
                </span>
              </li>
            ))}
            {recommendations.length === 0 && <li className="text-sm text-white/50 light:text-slate-500">No recommendations yet — complete your profile to unlock these.</li>}
          </ul>
        </div>

        <div className="glass-card rounded-xl p-4 sm:p-5">
          <p className="text-sm font-semibold text-white light:text-slate-900">Profile Health Check</p>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {healthChecklist.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 text-xs">
                <span aria-hidden="true" className={item.status === "complete" ? "text-emerald-400" : "text-amber-400"}>
                  {item.status === "complete" ? "✓" : "⚠"}
                </span>
                <span className={item.status === "complete" ? "text-white/60 light:text-slate-500" : "text-white/40 light:text-slate-400"}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
