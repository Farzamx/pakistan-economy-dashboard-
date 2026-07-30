"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import PurchasingPowerForm from "@/components/purchasingPower/PurchasingPowerForm";
import PurchasingPowerResults from "@/components/purchasingPower/PurchasingPowerResults";
import PurchasingPowerCharts from "@/components/purchasingPower/PurchasingPowerCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import {
  computePurchasingPower,
  buildPurchasingPowerTimeline,
  findNearestIndexPoint,
  getAvailableYears,
} from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { useEconomicIdentity } from "@/lib/decisionSupportLab/economicIdentity";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiIndexPoint } from "@/lib/data/cpiMonthlyIndex";

interface Props {
  series: CpiIndexPoint[] | null;
}

const DEFAULT_AMOUNT = 100_000;

export default function PurchasingPowerCalculator({ series }: Props) {
  const { t } = useLanguage();
  const identity = useEconomicIdentity();
  const years = useMemo(() => (series ? getAvailableYears(series) : []), [series]);

  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [baseYear, setBaseYear] = useState<number | null>(null);
  const [targetYear, setTargetYear] = useState<number | null>(null);

  const effectiveBaseYear = baseYear ?? years[0]?.year ?? 0;
  const effectiveTargetYear = targetYear ?? years[years.length - 1]?.year ?? 0;

  const basePoint = years.find((y) => y.year === effectiveBaseYear)?.point ?? null;
  const targetPoint = years.find((y) => y.year === effectiveTargetYear)?.point ?? null;

  const result = useMemo(() => {
    if (!basePoint || !targetPoint || amount <= 0) return null;
    // Base must precede target — if a visitor picks them the "wrong" way
    // round, swap silently rather than showing a negative-inflation result
    // that reads as a bug.
    const [base, target] = basePoint.observationDate <= targetPoint.observationDate ? [basePoint, targetPoint] : [targetPoint, basePoint];
    return computePurchasingPower(amount, base, target);
  }, [amount, basePoint, targetPoint]);

  const timeline = useMemo(() => {
    if (!result || !series) return [];
    const base = { observationDate: result.baseDate, indexValue: result.baseIndex };
    const target = { observationDate: result.targetDate, indexValue: result.targetIndex };
    return buildPurchasingPowerTimeline(result.amount, base, target, series);
  }, [result, series]);

  // Income erosion insight: the real-value loss of the visitor's own
  // monthly income (from Economic Identity) over the most recent ~12
  // months of the same official index — reuses the identical
  // computePurchasingPower() math, just anchored to "12 months ago →
  // latest" instead of the user's own base/target selection.
  const incomeErosion = useMemo(() => {
    if (!series || series.length < 2 || identity.monthlyIncome <= 0) return null;
    const latest = series[series.length - 1];
    const yearAgoDate = `${parseInt(latest.observationDate.slice(0, 4), 10) - 1}${latest.observationDate.slice(4)}`;
    const anchor = findNearestIndexPoint(series, yearAgoDate);
    if (!anchor || anchor.observationDate === latest.observationDate) return null;
    const erosion = computePurchasingPower(identity.monthlyIncome, anchor, latest);
    return { realValueLossPct: erosion.purchasingPowerLostPct, periodLabel: "the past year" };
  }, [series, identity.monthlyIncome]);

  const insights = useMemo(() => generatePersonalInsights({ incomeErosion: incomeErosion ?? undefined }), [incomeErosion]);

  function buildReport(): ReportDefinition {
    if (!result) {
      return { toolName: "Purchasing Power Calculator", generatedAt: new Date().toISOString().slice(0, 10), sourceNote: "Source: Pakistan Bureau of Statistics", sections: [] };
    }
    return {
      toolName: "Purchasing Power Calculator",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: Pakistan Bureau of Statistics — National CPI Index",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `Rs ${Math.round(result.amount).toLocaleString("en-US")} from ${result.baseDate.slice(0, 7)} is worth Rs ${Math.round(result.realValueToday).toLocaleString("en-US")} in ${result.targetDate.slice(0, 7)} purchasing power — a loss of ${result.purchasingPowerLostPct.toFixed(1)}%.`,
          ],
          facts: [
            { label: "Original Amount", value: `Rs ${Math.round(result.amount).toLocaleString("en-US")}` },
            { label: "Real Value Today", value: `Rs ${Math.round(result.realValueToday).toLocaleString("en-US")}` },
            { label: "Purchasing Power Lost", value: `Rs ${Math.round(result.purchasingPowerLost).toLocaleString("en-US")} (${result.purchasingPowerLostPct.toFixed(1)}%)` },
            { label: "Inflation-Adjusted Equivalent", value: `Rs ${Math.round(result.inflationAdjustedValue).toLocaleString("en-US")}` },
            { label: "Total Inflation", value: `${result.totalInflationPct.toFixed(1)}%` },
          ],
        },
      ],
    };
  }

  if (!series || years.length === 0) {
    return (
      <div id="calculator-input" className="glass-card rounded-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-white light:text-slate-900">{t("decisionSupportLab.dataNotYetAvailableTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60 light:text-slate-500">{t("decisionSupportLab.dataNotYetAvailableDesc")}</p>
      </div>
    );
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <PurchasingPowerForm
        amount={amount}
        onAmountChange={setAmount}
        years={years}
        baseYear={effectiveBaseYear}
        onBaseYearChange={setBaseYear}
        targetYear={effectiveTargetYear}
        onTargetYearChange={setTargetYear}
      />

      {result && <PurchasingPowerResults result={result} />}

      {result && (
        <ToolShareCard
          title="My Purchasing Power"
          headlineValue={`Rs ${Math.round(result.realValueToday).toLocaleString("en-US")}`}
          headlineTone="down"
          comparisonLine={`Rs ${Math.round(result.amount).toLocaleString("en-US")} from ${result.baseDate.slice(0, 7)} is now worth this in ${result.targetDate.slice(0, 7)} terms`}
          deltaLine={`-${result.purchasingPowerLostPct.toFixed(1)}% purchasing power lost`}
          bars={[
            { label: "Original Amount", value: result.amount, color: "#4d8df7" },
            { label: "Real Value Today", value: result.realValueToday, color: "#fb7185" },
          ]}
          badgeLines={["Pakistan Bureau of Statistics", `${result.baseDate.slice(0, 7)} → ${result.targetDate.slice(0, 7)}`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/purchasing-power"
          shareSummary={`Rs ${Math.round(result.amount).toLocaleString("en-US")} from ${result.baseDate.slice(0, 7)} is worth only Rs ${Math.round(result.realValueToday).toLocaleString("en-US")} today — a ${result.purchasingPowerLostPct.toFixed(1)}% loss in purchasing power.`}
          filenameBase="my-purchasing-power"
        />
      )}

      {result && (
        <ReportDownloadButton buildDefinition={buildReport} filename="purchasing-power-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
      )}

      <PersonalInsightsPanel insights={insights} />

      {result && timeline.length > 0 && <PurchasingPowerCharts result={result} timeline={timeline} />}

      <ExplainTheMath
        formula="Real Value Today = Amount × (Base Index ÷ Target Index); Inflation-Adjusted Value = Amount × (Target Index ÷ Base Index)"
        variables={[
          { symbol: "Amount", description: "The PKR amount you entered" },
          { symbol: "Base Index", description: "The National CPI index level at your chosen Base Year" },
          { symbol: "Target Index", description: "The National CPI index level at your chosen Target Year" },
        ]}
        methodology="Both figures come from dividing the same official National CPI index level at two points in time — this is standard index-based deflation, the same method economists use to compare money across years."
        sourceName="Pakistan Bureau of Statistics — National CPI Index"
        sourceUrl="https://www.pbs.gov.pk/cpi"
        lastUpdated={series[series.length - 1]?.observationDate ?? ""}
        dataFrequency="Monthly"
        assumptions={["Assumes the amount was held as cash (or an equivalent zero-return asset), not invested or earning interest.", "Uses each calendar year's latest available month as that year's representative index value."]}
        limitations={[
          `This index series begins ${series[0]?.observationDate.slice(0, 7)} — PBS does not publish a longer machine-readable back-series, so earlier years cannot be selected.`,
          "National-level index only — actual price changes may differ by province, city, or income bracket.",
        ]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows how much of your money's real buying power has been eroded by inflation between two points in time, using the same official index PBS uses to compute the national CPI."
        whyDifferent="Money itself doesn't lose numeric value, but what it can buy shrinks every time prices rise. This tool converts that abstract idea into a concrete rupee figure."
        howCalculated="The ratio of the National CPI index at your two chosen years tells you exactly how much less (or more, for the reverse direction) a fixed amount of money can buy."
        sources={["Pakistan Bureau of Statistics — National CPI Index (Base 2015-16 = 100)"]}
      />

      <DecisionSupportPanel
        whatHappened={result ? `You calculated the purchasing power of Rs ${Math.round(result.amount).toLocaleString("en-US")} between ${result.baseDate.slice(0, 7)} and ${result.targetDate.slice(0, 7)}.` : "Enter an amount and two years to see how inflation has changed its real value."}
        whyItHappened="Inflation compounds every month — even a moderate year-on-year rate erodes real value significantly over several years."
        whatToUnderstand="This same erosion applies to savings, salaries, and any fixed-PKR amount you don't actively adjust for inflation."
        relatedTools={[{ title: "Personal Inflation Calculator", href: "/decision-support-lab/personal-inflation" }, { title: "Budget Allocation Calculator", href: "/decision-support-lab/budget-allocation" }]}
        suggestedNext={{
          title: "See your own personal inflation rate",
          href: "/decision-support-lab/personal-inflation",
          reason: "Your personal inflation rate shows whether YOUR spending pattern erodes faster or slower than this national average.",
        }}
      />
    </div>
  );
}
