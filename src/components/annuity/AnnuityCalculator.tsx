"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import AnnuityForm, { type AnnuityMode } from "@/components/annuity/AnnuityForm";
import AnnuityResults from "@/components/annuity/AnnuityResults";
import AnnuityCharts from "@/components/annuity/AnnuityCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import RequiredInputsGate from "@/components/decisionSupportLab/RequiredInputsGate";
import { annuityPresentValue, annuityFutureValue, type AnnuityType } from "@/lib/decisionSupportLab/timeValueEngine";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";

export default function AnnuityCalculator() {
  const { t } = useLanguage();

  const [type, setType] = useState<AnnuityType>("ordinary");
  const [mode, setMode] = useState<AnnuityMode>("contribution");
  const [payment, setPayment] = useState(0);
  const [targetValue, setTargetValue] = useState(0);
  const [ratePct, setRatePct] = useState(0);
  const [periods, setPeriods] = useState(60);

  // In "target" mode, the required payment is solved by evaluating
  // annuityFutureValue() at a payment of exactly 1 — since the formula is
  // linear in payment, that single call yields the future-value factor,
  // and dividing the target by it gives the payment needed. No separate
  // "solve for payment" formula is added to the engine — this reuses the
  // existing function instead.
  const effectivePayment = useMemo(() => {
    if (mode === "contribution") return payment;
    if (targetValue <= 0) return 0;
    const factor = annuityFutureValue(1, ratePct, periods, type);
    return factor > 0 ? targetValue / factor : 0;
  }, [mode, payment, targetValue, ratePct, periods, type]);

  const hasRate = ratePct !== 0;
  const presentValueAmount = useMemo(
    () => (effectivePayment > 0 && hasRate ? annuityPresentValue(effectivePayment, ratePct, periods, type) : 0),
    [effectivePayment, hasRate, ratePct, periods, type],
  );
  const futureValueAmount = useMemo(
    () => (effectivePayment > 0 && hasRate ? annuityFutureValue(effectivePayment, ratePct, periods, type) : 0),
    [effectivePayment, hasRate, ratePct, periods, type],
  );

  const hasInput = (mode === "contribution" ? payment > 0 : targetValue > 0) && hasRate;

  function buildReport(): ReportDefinition {
    return {
      toolName: "Annuity Calculator",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: PEIC Time Value of Money Engine",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            mode === "contribution"
              ? `A ${type} annuity of Rs ${Math.round(payment).toLocaleString("en-US")} per period at ${ratePct.toFixed(2)}% for ${periods} periods has a present value of Rs ${Math.round(presentValueAmount).toLocaleString("en-US")} and a future value of Rs ${Math.round(futureValueAmount).toLocaleString("en-US")}.`
              : `To reach Rs ${Math.round(targetValue).toLocaleString("en-US")} in ${periods} periods at ${ratePct.toFixed(2)}% (${type} annuity), you'd need to contribute Rs ${Math.round(effectivePayment).toLocaleString("en-US")} per period.`,
          ],
          facts: [
            { label: "Annuity Type", value: type },
            { label: "Rate per Period", value: `${ratePct.toFixed(2)}%` },
            { label: "Periods", value: `${periods}` },
            { label: "Payment per Period", value: `Rs ${Math.round(effectivePayment).toLocaleString("en-US")}` },
            { label: "Present Value", value: `Rs ${Math.round(presentValueAmount).toLocaleString("en-US")}` },
            { label: "Future Value", value: `Rs ${Math.round(futureValueAmount).toLocaleString("en-US")}` },
          ],
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <AnnuityForm
        type={type}
        onTypeChange={setType}
        mode={mode}
        onModeChange={setMode}
        payment={payment}
        onPaymentChange={setPayment}
        targetValue={targetValue}
        onTargetValueChange={setTargetValue}
        ratePct={ratePct}
        onRatePctChange={setRatePct}
        periods={periods}
        onPeriodsChange={setPeriods}
      />

      <RequiredInputsGate
        requiredInputs={[
          { id: mode === "contribution" ? "an-payment" : "an-target", label: mode === "contribution" ? "Payment per Period" : "Target Value", filled: mode === "contribution" ? payment > 0 : targetValue > 0 },
          { id: "an-rate", label: "Rate per Period", filled: hasRate },
        ]}
      >
        <AnnuityResults mode={mode} presentValueAmount={presentValueAmount} futureValueAmount={futureValueAmount} requiredContribution={mode === "target" ? effectivePayment : null} />

        <ToolShareCard
          title="My Annuity"
          headlineValue={`Rs ${Math.round(futureValueAmount).toLocaleString("en-US")}`}
          headlineTone="down"
          comparisonLine={`${type === "due" ? "Annuity due" : "Ordinary annuity"} of Rs ${Math.round(effectivePayment).toLocaleString("en-US")} per period at ${ratePct.toFixed(2)}%`}
          bars={[
            { label: "Present Value", value: presentValueAmount, color: "#4d8df7" },
            { label: "Future Value", value: futureValueAmount, color: "#34d399" },
          ]}
          badgeLines={["PEIC Time Value Engine", `${periods} periods`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/annuity"
          shareSummary={`A ${type} annuity of Rs ${Math.round(effectivePayment).toLocaleString("en-US")} per period at ${ratePct.toFixed(2)}% for ${periods} periods grows to Rs ${Math.round(futureValueAmount).toLocaleString("en-US")}.`}
          filenameBase="my-annuity"
        />

        <ReportDownloadButton buildDefinition={buildReport} filename="annuity-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />

        <AnnuityCharts payment={effectivePayment} ratePct={ratePct} periods={periods} type={type} />
      </RequiredInputsGate>

      <ExplainTheMath
        formula="PV = Payment × (1 − (1 + r)^−n) ÷ r;  FV = Payment × ((1 + r)^n − 1) ÷ r  [× (1+r) for annuity due]"
        variables={[
          { symbol: "Payment", description: "The equal amount paid or received each period" },
          { symbol: "r", description: "The rate per period, as a percentage" },
          { symbol: "n", description: "The number of periods" },
        ]}
        methodology="An ordinary annuity assumes payments at the end of each period; an annuity due assumes payments at the start, so each one compounds for one extra period — the same annuityPresentValue()/annuityFutureValue() primitives that power the Loan & EMI Calculator's payment formula."
        sourceName="PEIC Time Value of Money Engine"
        lastUpdated=""
        assumptions={["Assumes every payment is exactly equal and the rate is constant for the entire horizon."]}
        limitations={["Real savings plans and pensions may have variable contributions or rates — this models the idealized constant-payment case."]}
      />

      <EducationalPanel
        whatDoesThisMean="This values a stream of equal, regular payments — either what that stream is worth today (present value) or what it grows into (future value) — or works backward to find the payment needed to hit a target."
        whyDifferent="A loan, a savings plan, a pension, and a lease are all annuities under the hood — the same math values all of them, just with different signs and interpretations of 'payment.'"
        howCalculated="Each payment is treated as its own single sum, discounted or compounded to a common point in time, then summed — the closed-form formulas above are just the algebraic shortcut for that sum."
        sources={["PEIC Time Value of Money Engine — deterministic, no AI or estimation involved."]}
      />

      <DecisionSupportPanel
        whatHappened={
          hasInput
            ? mode === "contribution"
              ? `You valued a ${type} annuity of Rs ${Math.round(payment).toLocaleString("en-US")} per period over ${periods} periods.`
              : `You found the contribution needed to reach Rs ${Math.round(targetValue).toLocaleString("en-US")} over ${periods} periods.`
            : "Choose a mode, enter your payment or target, a rate, and a number of periods."
        }
        whyItHappened="An annuity due is always worth slightly more than an otherwise-identical ordinary annuity, because every payment compounds for one extra period."
        whatToUnderstand="This is the exact math behind the Loan & EMI Calculator (a loan is the lender's annuity) and will power Retirement Planning and Goal Planning tools directly — the same present-value and future-value formulas, applied to a savings goal instead of a loan."
        relatedTools={[{ title: "Loan & EMI Calculator", href: "/decision-support-lab/loan-emi" }, { title: "Financial Formula Explorer", href: "/decision-support-lab/formula-explorer" }]}
        suggestedNext={{
          title: "See every formula in one reference page",
          href: "/decision-support-lab/formula-explorer",
          reason: "Compare the annuity formulas against every other Time Value of Money formula in one place.",
        }}
      />
    </div>
  );
}
