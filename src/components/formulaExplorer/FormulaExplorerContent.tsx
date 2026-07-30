"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import FormulaCard from "@/components/formulaExplorer/FormulaCard";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import { buildFormulaDefinitions } from "@/components/formulaExplorer/formulaDefinitions";

export default function FormulaExplorerContent() {
  const { t } = useLanguage();
  const definitions = useMemo(() => buildFormulaDefinitions(t), [t]);

  return (
    <div className="flex flex-col gap-10">
      {definitions.map((definition) => (
        <FormulaCard key={definition.id} definition={definition} />
      ))}

      <DecisionSupportPanel
        whatHappened="You've now seen every formula behind the Time Value of Money tools in one place, each with a live worked example."
        whyItHappened="Every calculator in this section of the Lab — Present Value, Future Value, Compound Interest, Loan & EMI, Annuity, Discount Factor Explorer — is a thin interface over exactly these formulas, computed by the same shared engine."
        whatToUnderstand="Understanding these formulas once makes every other tool's output easier to reason about — and the same primitives will power future institutional tools (DCF, Bond Valuation, Retirement Planning) without any of this math being rebuilt."
        relatedTools={[
          { title: "Present Value Calculator", href: "/decision-support-lab/present-value" },
          { title: "Loan & EMI Calculator", href: "/decision-support-lab/loan-emi" },
          { title: "Annuity Calculator", href: "/decision-support-lab/annuity" },
        ]}
      />
    </div>
  );
}
