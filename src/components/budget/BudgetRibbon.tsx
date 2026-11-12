import { BUDGET_HISTORICAL } from "@/data/budgetHistorical";

/**
 * Slim navy-and-gold header for the Budget Tracker Workshop. Deliberately a ribbon, not a hero: one line of identity and one line of scope.
 * It is a server component with no state, and its navy ground is the same in the light and dark themes (a fixed brand band, so it reads as one
 * object in both), with text colours chosen against that navy rather than against the page theme.
 */
export default function BudgetRibbon() {
  const first = BUDGET_HISTORICAL.years[0].fiscalYear;
  const last = BUDGET_HISTORICAL.years[BUDGET_HISTORICAL.years.length - 1].fiscalYear;
  return (
    <header
      className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-1 overflow-hidden rounded-xl border px-4 py-2.5 sm:px-5"
      style={{
        background: "linear-gradient(100deg, #0a1730 0%, #0f2347 55%, #14305e 100%)",
        borderColor: "rgba(214, 178, 94, 0.45)",
        boxShadow: "inset 0 -1px 0 rgba(214, 178, 94, 0.25)",
      }}
      data-testid="budget-ribbon"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-5 w-[3px] rounded-full" style={{ background: "linear-gradient(#e8cf8c, #b8923a)" }} />
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#e8cf8c" }}>
          Budget Tracker Workshop
        </p>
      </div>
      <p className="text-[11px] tracking-wide" style={{ color: "rgba(232, 236, 245, 0.78)" }}>
        Federal Budget Estimates · FY{first} to FY{last} · Source: Finance Division, Budget in Brief
      </p>
    </header>
  );
}
