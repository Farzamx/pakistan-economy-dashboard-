"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import RealReturnDashboardForm from "@/components/realReturnDashboard/RealReturnDashboardForm";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import RealReturnDashboardResults from "@/components/realReturnDashboard/RealReturnDashboardResults";
import RealReturnDashboardCharts from "@/components/realReturnDashboard/RealReturnDashboardCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { projectCompounding, deflateCompounding } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { calculatePurchasingPowerPreservation } from "@/lib/decisionSupportLab/investmentEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function RealReturnDashboardCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [startingWealth, setStartingWealth] = useState(0);
  const [nominalReturnPct, setNominalReturnPct] = useState(0);
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;
  const [taxRatePct, setTaxRatePct] = useState(0);
  const [years, setYears] = useState(5);

  // Follows the brief's exact flow: Nominal Wealth → Inflation → Taxes →
  // Real Wealth. Inflation is stripped from the nominal ending value
  // first (deflateCompounding, reused from purchasingPowerEngine), then
  // tax is applied to whatever real gain remains — disclosed as a
  // simplified illustrative order in ExplainTheMath's limitations, since
  // real capital-gains tax is typically levied on nominal, not real,
  // gains.
  const result = useMemo(() => {
    if (startingWealth <= 0) return null;
    const nominalWealth = projectCompounding(startingWealth, nominalReturnPct, years);
    const afterInflationValue = deflateCompounding(nominalWealth, inflationPct, years);
    const afterInflationGain = Math.max(0, afterInflationValue - startingWealth);
    const taxAmount = afterInflationGain * (taxRatePct / 100);
    const realWealth = afterInflationValue - taxAmount;
    const inflationLoss = nominalWealth - afterInflationValue;
    const purchasingPowerChangePct = calculatePurchasingPowerPreservation(startingWealth, realWealth) - 100;
    return { nominalWealth, afterInflationValue, taxAmount, realWealth, inflationLoss, purchasingPowerChangePct };
  }, [startingWealth, nominalReturnPct, inflationPct, taxRatePct, years]);

  const insights = useMemo(() => {
    if (!result) return [];
    const nominalGain = result.nominalWealth - startingWealth;
    const realGain = result.realWealth - startingWealth;
    return generatePersonalInsights({ inflationGainElimination: { nominalGainAmount: nominalGain, realGainAmount: realGain } });
  }, [result, startingWealth]);

  function buildReport(): ReportDefinition {
    if (!result) {
      return { toolName: "Real Return Intelligence Dashboard", generatedAt: new Date().toISOString().slice(0, 10), sourceNote: "Source: PEIC Investment Intelligence Engine", sections: [] };
    }
    return {
      toolName: "Real Return Intelligence Dashboard",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: PEIC Investment Intelligence Engine",
      sections: [
        {
          heading: "Nominal Wealth → Real Wealth",
          paragraphs: [
            `Rs ${Math.round(startingWealth).toLocaleString("en-US")} at ${nominalReturnPct.toFixed(1)}% nominal return over ${years} years grows to Rs ${Math.round(result.nominalWealth).toLocaleString("en-US")} nominal, but only Rs ${Math.round(result.realWealth).toLocaleString("en-US")} in real terms after ${inflationPct.toFixed(1)}% inflation${taxRatePct > 0 ? ` and ${taxRatePct.toFixed(1)}% tax` : ""}.`,
          ],
          facts: [
            { label: "Starting Wealth", value: `Rs ${Math.round(startingWealth).toLocaleString("en-US")}` },
            { label: "Nominal Return", value: `${nominalReturnPct.toFixed(1)}%` },
            { label: "Inflation Rate", value: `${inflationPct.toFixed(1)}%` },
            { label: "Tax Rate", value: `${taxRatePct.toFixed(1)}%` },
            { label: "Years", value: `${years}` },
            { label: "Nominal Wealth", value: `Rs ${Math.round(result.nominalWealth).toLocaleString("en-US")}` },
            { label: "Inflation Loss", value: `Rs ${Math.round(result.inflationLoss).toLocaleString("en-US")}` },
            { label: "Tax Amount", value: `Rs ${Math.round(result.taxAmount).toLocaleString("en-US")}` },
            { label: "Real Wealth", value: `Rs ${Math.round(result.realWealth).toLocaleString("en-US")}` },
            { label: "Purchasing Power Change", value: `${result.purchasingPowerChangePct >= 0 ? "+" : ""}${result.purchasingPowerChangePct.toFixed(1)}%` },
          ],
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <RealReturnDashboardForm
        startingWealth={startingWealth}
        onStartingWealthChange={setStartingWealth}
        nominalReturnPct={nominalReturnPct}
        onNominalReturnPctChange={setNominalReturnPct}
        taxRatePct={taxRatePct}
        onTaxRatePctChange={setTaxRatePct}
        years={years}
        onYearsChange={setYears}
      />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <InflationRateField
          autoValuePct={officialInflationPct}
          autoLabel="Official Inflation (Latest)"
          tooltipText="Calculated automatically from the latest official CPI data. Since this projects into a future period, you can adjust this assumption below."
          useCustom={useCustomInflation}
          onUseCustomChange={setUseCustomInflation}
          customValuePct={customInflationPct}
          onCustomValuePctChange={setCustomInflationPct}
        />
      </div>

      {startingWealth <= 0 && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{t("decisionSupportLab.validationEnterAmount")}</div>
      )}

      {result && (
        <RealReturnDashboardResults
          nominalWealth={result.nominalWealth}
          inflationLoss={result.inflationLoss}
          taxAmount={result.taxAmount}
          realWealth={result.realWealth}
          purchasingPowerChangePct={result.purchasingPowerChangePct}
          hasTax={taxRatePct > 0}
        />
      )}

      {result && (
        <ToolShareCard
          title="My Real Wealth"
          headlineValue={`Rs ${Math.round(result.realWealth).toLocaleString("en-US")}`}
          headlineTone={result.purchasingPowerChangePct >= 0 ? "down" : "up"}
          comparisonLine={`Rs ${Math.round(startingWealth).toLocaleString("en-US")} today, ${years}-year projection`}
          deltaLine={`${result.purchasingPowerChangePct >= 0 ? "+" : ""}${result.purchasingPowerChangePct.toFixed(1)}% purchasing power`}
          bars={[
            { label: "Nominal Wealth", value: result.nominalWealth, color: "#4d8df7" },
            { label: "Real Wealth", value: result.realWealth, color: "#9b8afb" },
          ]}
          badgeLines={["PEIC Investment Intelligence", `${years}-year projection`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/real-return-dashboard"
          shareSummary={`My Rs ${Math.round(startingWealth).toLocaleString("en-US")} grows to Rs ${Math.round(result.nominalWealth).toLocaleString("en-US")} nominal, but only Rs ${Math.round(result.realWealth).toLocaleString("en-US")} in real terms after inflation.`}
          filenameBase="my-real-wealth"
        />
      )}

      {result && (
        <ReportDownloadButton buildDefinition={buildReport} filename="real-return-dashboard-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
      )}

      <PersonalInsightsPanel insights={insights} />

      {result && <RealReturnDashboardCharts startingWealth={startingWealth} nominalWealth={result.nominalWealth} afterInflationValue={result.afterInflationValue} realWealth={result.realWealth} />}

      <ExplainTheMath
        formula="Nominal Wealth = Starting Wealth × (1 + Return ÷ 100)^Years; After Inflation = Nominal Wealth ÷ (1 + Inflation ÷ 100)^Years; Real Wealth = After Inflation − (max(After Inflation − Starting Wealth, 0) × Tax Rate ÷ 100)"
        variables={[
          { symbol: "Starting Wealth", description: "Your wealth today" },
          { symbol: "Return", description: "Your nominal annual return" },
          { symbol: "Inflation", description: "The annual inflation rate" },
          { symbol: "Tax Rate", description: "Your effective tax rate on investment gains, if any" },
        ]}
        methodology="Composes projectCompounding() and deflateCompounding() from the Purchasing Power engine with calculatePurchasingPowerPreservation() from the Investment Intelligence engine — the same primitives every tool in this Lab already uses, following the exact Nominal → Inflation → Taxes → Real Wealth flow this dashboard is built around."
        sourceName="PEIC Investment Intelligence Engine"
        lastUpdated=""
        assumptions={["Assumes a constant nominal return, inflation rate and tax rate for the entire horizon."]}
        limitations={[
          "This is a simplified illustration, not tax advice — real capital-gains tax in Pakistan (and most jurisdictions) is levied on nominal gains, not the inflation-adjusted real gain modeled here for presentation-order clarity.",
          "Ignores wealth tax, transaction costs, and any tax-advantaged account treatment.",
        ]}
      />

      <EducationalPanel
        whatDoesThisMean="This is the complete picture — the same wealth traced from its nominal (headline) value, through inflation, through taxes if you enter a rate, down to what it's really worth."
        whyDifferent="Most statements stop at 'nominal wealth' or 'after-tax wealth' — this dashboard adds the inflation step every other view skips, showing the full chain from what you have on paper to what you can actually buy."
        howCalculated="Your wealth compounds forward at the nominal return; inflation is stripped out over the same horizon; tax (if any) is applied to what's left; the final figure is your real wealth, compared back to your starting purchasing power."
        sources={["PEIC Investment Intelligence Engine — deterministic, no AI or estimation involved.", "Pakistan Bureau of Statistics — National CPI Index (default inflation rate)"]}
      />

      <DecisionSupportPanel
        whatHappened={
          result
            ? `You traced Rs ${Math.round(startingWealth).toLocaleString("en-US")} through ${years} years of ${nominalReturnPct.toFixed(1)}% nominal return, ${inflationPct.toFixed(1)}% inflation${taxRatePct > 0 ? `, and ${taxRatePct.toFixed(1)}% tax` : ""}.`
            : "Enter your wealth, nominal return, inflation, an optional tax rate, and a horizon to see the full waterfall."
        }
        whyItHappened="Inflation and taxes both erode wealth independently — seeing both steps in one waterfall, rather than a single blended 'after-everything' number, shows which one is costing you more."
        whatToUnderstand="Every other Investment Intelligence tool in this Lab drills into one piece of this picture — use the Asset Comparison Lab, Portfolio Purchasing Power, or Inflation Drag Analyzer to go deeper on any single step."
        relatedTools={[{ title: "Asset Comparison Lab", href: "/decision-support-lab/asset-comparison-lab" }, { title: "Inflation Drag Analyzer", href: "/decision-support-lab/inflation-drag-analyzer" }]}
        suggestedNext={{
          title: "See this same math applied to a real portfolio",
          href: "/decision-support-lab/portfolio-purchasing-power",
          reason: "Apply the nominal-to-real chain across your actual named assets and allocation weights.",
        }}
      />
    </div>
  );
}
