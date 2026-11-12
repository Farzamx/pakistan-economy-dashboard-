import BudgetSankeyDiagram from "./BudgetSankeyDiagram";
import { prepareBudgetSankeyYears } from "@/lib/budget/budgetSankey";
import { BUDGET_HISTORICAL } from "@/data/budgetHistorical";

/**
 * Server component: builds, validates and reconciles every year's flow graph on the server, so the first HTML already carries the diagram, its figures
 * and its reconciliation, and passes plain data to the interactive client component. A year that fails reconciliation is passed along with its
 * diagnostics so the page can explain why it is withheld.
 */
export default function BudgetSankeySection() {
  const all = BUDGET_HISTORICAL.years;
  return <BudgetSankeyDiagram years={prepareBudgetSankeyYears()} historicalCoverage={{ first: all[0].fiscalYear, last: all[all.length - 1].fiscalYear }} />;
}
