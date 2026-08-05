"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import LoanEmiForm, { LOAN_PAYMENTS_PER_YEAR, type LoanPaymentFrequency } from "@/components/loanEmi/LoanEmiForm";
import LoanEmiResults from "@/components/loanEmi/LoanEmiResults";
import LoanEmiCharts from "@/components/loanEmi/LoanEmiCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import RequiredInputsGate from "@/components/decisionSupportLab/RequiredInputsGate";
import { buildAmortizationSchedule } from "@/lib/decisionSupportLab/timeValueEngine";
import { useEconomicProfile, setEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";

export default function LoanEmiCalculator() {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();

  // Prefilled from and synced back to the profile's own debt fields — this
  // is the same real-world figure (not a loosely-related default like
  // Present/Future Value's savings prefill), so it stays a genuine sync.
  const [loanAmount, setLoanAmountState] = useState(() => profile.debtAmount);
  const [ratePct, setRatePctState] = useState(() => profile.debtInterestRate);
  function setLoanAmount(value: number) {
    setLoanAmountState(value);
    setEconomicProfile({ debtAmount: value, hasDebt: value > 0 });
  }
  function setRatePct(value: number) {
    setRatePctState(value);
    setEconomicProfile({ debtInterestRate: value });
  }
  const [termYears, setTermYears] = useState(20);
  const [frequency, setFrequency] = useState<LoanPaymentFrequency>("monthly");

  const hasRate = ratePct !== 0;
  const schedule = useMemo(() => {
    if (loanAmount <= 0 || !hasRate) return null;
    const paymentsPerYear = LOAN_PAYMENTS_PER_YEAR[frequency];
    return buildAmortizationSchedule(loanAmount, ratePct / paymentsPerYear, termYears * paymentsPerYear);
  }, [loanAmount, hasRate, ratePct, termYears, frequency]);

  function buildReport(): ReportDefinition {
    if (!schedule) {
      return { toolName: "Loan & EMI Calculator", generatedAt: new Date().toISOString().slice(0, 10), sourceNote: "Source: PEIC Time Value of Money Engine", sections: [] };
    }
    return {
      toolName: "Loan & EMI Calculator",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: PEIC Time Value of Money Engine",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `A Rs ${Math.round(loanAmount).toLocaleString("en-US")} loan at ${ratePct.toFixed(1)}% over ${termYears} years (${frequency} payments) requires a payment of Rs ${Math.round(schedule.payment).toLocaleString("en-US")} per period, totaling Rs ${Math.round(schedule.totalInterest).toLocaleString("en-US")} in interest.`,
          ],
          facts: [
            { label: "Loan Amount", value: `Rs ${Math.round(loanAmount).toLocaleString("en-US")}` },
            { label: "Annual Rate", value: `${ratePct.toFixed(1)}%` },
            { label: "Term", value: `${termYears} years` },
            { label: "Payment Frequency", value: frequency },
            { label: "Payment", value: `Rs ${Math.round(schedule.payment).toLocaleString("en-US")}` },
            { label: "Total Interest", value: `Rs ${Math.round(schedule.totalInterest).toLocaleString("en-US")}` },
            { label: "Total Principal", value: `Rs ${Math.round(schedule.totalPrincipal).toLocaleString("en-US")}` },
          ],
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <LoanEmiForm
        loanAmount={loanAmount}
        onLoanAmountChange={setLoanAmount}
        ratePct={ratePct}
        onRatePctChange={setRatePct}
        termYears={termYears}
        onTermYearsChange={setTermYears}
        frequency={frequency}
        onFrequencyChange={setFrequency}
      />

      <RequiredInputsGate
        requiredInputs={[
          { id: "le-amount", label: "Loan Amount", filled: loanAmount > 0 },
          { id: "le-rate", label: "Annual Rate", filled: hasRate },
        ]}
      >
        {schedule && <LoanEmiResults schedule={schedule} />}

        {schedule && (
          <ToolShareCard
            title="My Loan Payment"
            headlineValue={`Rs ${Math.round(schedule.payment).toLocaleString("en-US")}`}
            headlineTone="neutral"
            comparisonLine={`Rs ${Math.round(loanAmount).toLocaleString("en-US")} loan at ${ratePct.toFixed(1)}% over ${termYears} years`}
            deltaLine={`Total interest: Rs ${Math.round(schedule.totalInterest).toLocaleString("en-US")}`}
            bars={[
              { label: "Total Principal", value: schedule.totalPrincipal, color: "#4d8df7" },
              { label: "Total Interest", value: schedule.totalInterest, color: "#fb7185" },
            ]}
            badgeLines={["PEIC Time Value Engine", `${frequency} payments`]}
            shareUrl="https://www.pakeconintel.com/decision-support-lab/loan-emi"
            shareSummary={`A Rs ${Math.round(loanAmount).toLocaleString("en-US")} loan at ${ratePct.toFixed(1)}% over ${termYears} years costs Rs ${Math.round(schedule.payment).toLocaleString("en-US")} per payment, Rs ${Math.round(schedule.totalInterest).toLocaleString("en-US")} in total interest.`}
            filenameBase="my-loan-payment"
          />
        )}

        {schedule && (
          <ReportDownloadButton buildDefinition={buildReport} filename="loan-emi-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
        )}

        {schedule && <LoanEmiCharts schedule={schedule} />}
      </RequiredInputsGate>

      <ExplainTheMath
        formula="Payment = (Principal × r) ÷ (1 − (1 + r)^−n)"
        variables={[
          { symbol: "Principal", description: "The loan amount" },
          { symbol: "r", description: "The interest rate per payment period (annual rate ÷ payments per year)" },
          { symbol: "n", description: "The total number of payments (term in years × payments per year)" },
        ]}
        methodology="This is loanPayment() and buildAmortizationSchedule() from the Time Value of Money engine — the payment amount is solved from the same annuity present-value formula the Annuity Calculator uses, since a loan is mathematically identical to the lender holding an annuity."
        sourceName="PEIC Time Value of Money Engine"
        lastUpdated=""
        assumptions={["Assumes a fixed interest rate for the entire term.", "Assumes no prepayments, fees, or missed payments."]}
        limitations={["Real loans may include fees, insurance, or rate resets not modeled here — always check your actual loan agreement."]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows your exact loan payment and, critically, how much of every single payment goes to interest versus paying down your actual debt."
        whyDifferent="Early payments are mostly interest — the amortization schedule shows this shifting toward principal as your balance shrinks, which is why paying off a loan early saves more interest than the 'average' rate might suggest."
        howCalculated="The level payment is solved so that it exactly pays off the loan (principal plus all interest) over the term; each period's interest is calculated on the remaining balance, and the rest of the payment reduces principal."
        sources={["PEIC Time Value of Money Engine — deterministic, no AI or estimation involved."]}
      />

      <DecisionSupportPanel
        whatHappened={
          schedule
            ? `You calculated a Rs ${Math.round(loanAmount).toLocaleString("en-US")} loan at ${ratePct.toFixed(1)}% over ${termYears} years, with ${frequency} payments of Rs ${Math.round(schedule.payment).toLocaleString("en-US")}.`
            : "Enter a loan amount, rate, term, and payment frequency to see your payment and amortization schedule."
        }
        whyItHappened="A level payment loan front-loads interest — your balance declines slowly at first and faster later, even though every payment is the same size."
        whatToUnderstand="The total interest figure is often larger than borrowers expect on long terms — compare a few different terms or rates to see how much term length alone affects total cost."
        relatedTools={[{ title: "Annuity Calculator", href: "/decision-support-lab/annuity" }, { title: "Compound Interest Calculator", href: "/decision-support-lab/compound-interest" }]}
        suggestedNext={{
          title: "See the same math from the lender's side",
          href: "/decision-support-lab/annuity",
          reason: "A loan is mathematically identical to an annuity — see how a stream of equal payments is valued.",
        }}
      />
    </div>
  );
}
