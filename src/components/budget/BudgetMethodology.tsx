import type { BudgetYearRecord } from "@/data/budgetHistorical";
import { BUDGET_NOMINAL_GDP } from "@/data/budgetNominalGdp";
import { Disclosure } from "@/components/shell/Disclosure";

/**
 * Methodology, definitions, limitations and the per-year source register for the Budget Tracker. Server-rendered static content (no state), so it
 * is in the first HTML for search engines and readers. The register is generated from the dataset's own citations, so it cannot drift from it.
 */

export function BudgetSourceRegister({ years, heading = "Source register" }: { years: BudgetYearRecord[]; heading?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white/85 light:text-slate-800">{heading}</h3>
      <p className="mt-1 text-xs text-white/55 light:text-slate-500">
        One row per fiscal year: the official Budget in Brief the Budget Estimate figures were read from (Finance Division, Government of Pakistan).
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs">
          <thead>
            <tr className="text-white/70 light:text-slate-600">
              <th scope="col" className="py-1.5 pr-3 font-medium">Fiscal year</th>
              <th scope="col" className="px-2 py-1.5 font-medium">Basis</th>
              <th scope="col" className="px-2 py-1.5 font-medium">Document</th>
              <th scope="col" className="px-2 py-1.5 font-medium">Tables used</th>
            </tr>
          </thead>
          <tbody className="text-white/60 light:text-slate-600">
            {years.map((y) => (
              <tr key={y.fiscalYear} className="border-t border-white/10 light:border-slate-200 align-top">
                <th scope="row" className="py-1.5 pr-3 font-normal tabular-nums">FY{y.fiscalYear}</th>
                <td className="px-2 py-1.5">{y.estimateType === "BE" ? "Budget Estimate" : y.estimateType}</td>
                <td className="px-2 py-1.5">
                  <a href={y.citations.budgetInBrief.url} target="_blank" rel="noopener noreferrer" className="text-neon-blue underline-offset-2 hover:underline">
                    {y.citations.budgetInBrief.document} FY{y.fiscalYear}
                  </a>
                </td>
                <td className="px-2 py-1.5">{y.citations.budgetInBrief.tables.join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const DEFINITIONS: { term: string; text: string }[] = [
  { term: "Budget Estimate (BE)", text: "The figure the government approved at the start of the fiscal year. Every number on this page is a Budget Estimate; revised estimates and actual outturns are never mixed in, because later documents restate them." },
  { term: "Total outlay", text: "Budget in Brief's Total Expenditure: current plus development spending of the federal government. It does not include the provinces' NFC share, which is deducted on the revenue side." },
  { term: "Budget envelope", text: "Total outlay plus provincial transfers. The base for the allocation views, because provincial transfers are not part of total outlay and cannot sit beside the other slices on that base." },
  { term: "Debt servicing", text: "The Interest Payments line as printed: the cost of borrowing, not repayment of principal. Not itemised for FY2010-11." },
  { term: "Defence", text: "The Defence line of the budget tables as printed." },
  { term: "PSDP", text: "The federal Public Sector Development Programme: the federal development budget." },
  { term: "Subsidies", text: "The Subsidies line as printed." },
  { term: "Provincial transfers", text: "The provinces' share of the divisible pool under the NFC award, as printed." },
  { term: "Fiscal deficit", text: "The overall budgeted deficit (federal and provincial consolidated, as Budget in Brief prints it), in rupees and as a percentage of GDP. It is the deficit target set in the budget, not the outcome. Unlike every other line it is not purely federal." },
  { term: "Federal education and health", text: "Federal current expenditure on education affairs and health affairs only (printed in Rs million, converted to Rs billion). Education and health are mostly provincial responsibilities since the 18th Amendment (2010); these are not national spending on either, and development (PSDP) spending is excluded." },
];

const LIMITATIONS: string[] = [
  "Budget Estimates are plans, not outturns. What was actually spent can differ, sometimes by a large amount.",
  "Amounts are nominal rupees at each year's own prices. Nothing here is adjusted for inflation, so growth rates include inflation and are not real growth.",
  "FY2010-11 does not itemise interest, pension or grants (they are inside General Public Service). Those figures are missing for that year, not zero, and charts start those lines at FY2011-12.",
  "Federal figures only, with one disclosed exception: the fiscal deficit is the consolidated (federal and provincial) deficit as Budget in Brief prints it. Provincial budgets are tracked separately and are never added to or compared with these figures here.",
  "Classification can change between documents. Series are compared across years only for lines that Budget in Brief prints under the same name; where a definition changed the dataset does not adjust it.",
  "% of GDP uses the nominal GDP printed in Budget in Brief from FY2019-20. For earlier years GDP is implied from the printed deficit (rupees ÷ per cent of GDP); the per cent is printed to one decimal, so implied GDP carries a rounding uncertainty of up to about ±1.4%.",
  "The data is entered by hand from PDF documents once per budget cycle and is not a live feed.",
];

export default function BudgetMethodology({ years }: { years: BudgetYearRecord[] }) {
  const firstStated = BUDGET_NOMINAL_GDP[0]?.fiscalYear;
  return (
    <section className="glass-card flex flex-col gap-6 rounded-2xl p-6 sm:p-8" aria-labelledby="method-h" data-testid="budget-methodology">
      <div>
        <h2 id="method-h" className="text-xl font-semibold text-white light:text-slate-900">Methodology, definitions and sources</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60 light:text-slate-600">
          Every figure is a Budget Estimate transcribed from the Budget in Brief of the year it belongs to. Percentages name their base on the chart that shows them: share of total outlay, share of the budget envelope, or share of nominal GDP (printed from {firstStated ?? "FY2019-20"}, implied before). Where a total does not reconcile, the page says so instead of adjusting a number.
        </p>
      </div>

      <Disclosure summary={`Definitions (${DEFINITIONS.length})`} testId="budget-definitions">
        <dl className="mt-2 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {DEFINITIONS.map((d) => (
            <div key={d.term}>
              <dt className="text-xs font-semibold text-white/80 light:text-slate-700">{d.term}</dt>
              <dd className="mt-0.5 text-xs leading-relaxed text-white/55 light:text-slate-500">{d.text}</dd>
            </div>
          ))}
        </dl>
      </Disclosure>

      <div>
        <h3 className="text-sm font-semibold text-white/85 light:text-slate-800">Known limitations</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-white/55 light:text-slate-500">
          {LIMITATIONS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>

      <Disclosure summary={`Source register: ${years.length} fiscal years`} testId="budget-source-register">
        <BudgetSourceRegister years={years} />
      </Disclosure>

      <Disclosure summary="Nominal GDP used for &ldquo;% of GDP&rdquo;" testId="budget-gdp-table">
        <p className="mt-1 text-xs text-white/55 light:text-slate-500">Printed in the Budget in Brief for the budget year (Rs billion).</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-xs">
            <thead>
              <tr className="text-white/70 light:text-slate-600">
                <th scope="col" className="py-1.5 pr-3 font-medium">Fiscal year</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">GDP, Rs bn</th>
                <th scope="col" className="px-2 py-1.5 font-medium">Where printed</th>
              </tr>
            </thead>
            <tbody className="text-white/60 light:text-slate-600">
              {BUDGET_NOMINAL_GDP.map((g) => (
                <tr key={g.fiscalYear} className="border-t border-white/10 light:border-slate-200 align-top">
                  <th scope="row" className="py-1.5 pr-3 font-normal tabular-nums">FY{g.fiscalYear}</th>
                  <td className="px-2 py-1.5 text-right tabular-nums">{g.valueRsBn.toLocaleString("en-US")}</td>
                  <td className="px-2 py-1.5">{g.document}: {g.table}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Disclosure>
    </section>
  );
}
