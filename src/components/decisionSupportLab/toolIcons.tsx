// Minimal line-icon set, one per Decision Support Lab tool (keyed by tool
// id — see src/lib/decisionSupportLab/tools.ts). Same hand-rolled
// convention as src/components/personalInflation/categoryIcons.tsx: a
// stroke-based 24x24 glyph inheriting currentColor rather than an icon
// library dependency for 8 glyphs.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

const ICONS: Record<string, (props: IconProps) => React.ReactElement> = {
  // Emergency Fund Planner — a shield (safety/liquidity)
  "emergency-fund-planner": (p) => (
    <Base {...p}>
      <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </Base>
  ),
  // Wealth Accumulation Planner — a rising bar chart toward a target
  "wealth-accumulation-planner": (p) => (
    <Base {...p}>
      <path d="M4 20V14M9.5 20V10M15 20V6M20 20V3" />
      <path d="M2 20h20" />
    </Base>
  ),
  // Personal Inflation Calculator — a rising line with a percent mark
  "personal-inflation": (p) => (
    <Base {...p}>
      <path d="M3 17l5-6 4 3 8-9" />
      <circle cx="8" cy="6" r="1.6" />
      <circle cx="17" cy="17" r="1.6" />
    </Base>
  ),
  // Purchasing Power Calculator — a banknote losing value
  "purchasing-power": (p) => (
    <Base {...p}>
      <rect x="2.5" y="7" width="19" height="11" rx="1.5" />
      <circle cx="12" cy="12.5" r="2.75" />
      <path d="M12 4v3M12 20v0" />
    </Base>
  ),
  // Salary Purchasing Power — a briefcase
  "salary-purchasing-power": (p) => (
    <Base {...p}>
      <rect x="3" y="8" width="18" height="12" rx="1.5" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </Base>
  ),
  // Budget Allocation — a donut/pie slice
  "budget-allocation": (p) => (
    <Base {...p}>
      <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
      <path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z" />
    </Base>
  ),
  // Raise Reality Check — a payslip with a check/cross split
  "raise-reality-check": (p) => (
    <Base {...p}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 8h8M8 12h5" />
      <path d="M8 16.5l2 2 4-4" />
    </Base>
  ),
  // Salary Required — a target with an arrow
  "salary-required": (p) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M17 3l-3.5 6.5M20.5 6.5 14 10" />
    </Base>
  ),
  // Future Salary Projection — an ascending line with dots
  "future-salary-projection": (p) => (
    <Base {...p}>
      <path d="M3 18l5-5 4 3 8-9" />
      <circle cx="3" cy="18" r="1.4" />
      <circle cx="8" cy="13" r="1.4" />
      <circle cx="12" cy="16" r="1.4" />
      <circle cx="20" cy="7" r="1.4" />
    </Base>
  ),
  // Personal Economic Health Score — a heartbeat pulse in a shield
  "health-score": (p) => (
    <Base {...p}>
      <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3Z" />
      <path d="M8 12h2l1.5-3 2 6 1.5-3H16" />
    </Base>
  ),
  // Compound Interest — a stacked/accelerating bar growth
  "compound-interest": (p) => (
    <Base {...p}>
      <path d="M4 20V14M10 20V10M16 20V6M4 14l6-4 6-4" />
      <circle cx="20" cy="4.5" r="1.6" />
    </Base>
  ),
  // Loan & EMI — a document with a payment checkmark
  "loan-emi": (p) => (
    <Base {...p}>
      <rect x="4" y="3" width="14" height="18" rx="1.5" />
      <path d="M7.5 8h7M7.5 12h7M7.5 16h4" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M17 17.5l1 1 2-2" />
    </Base>
  ),
  // Annuity — repeating equal payment ticks along a line
  annuity: (p) => (
    <Base {...p}>
      <path d="M3 12h18" />
      <path d="M6 8v8M11 8v8M16 8v8" />
      <path d="M20 9l1.5 3-1.5 3" />
    </Base>
  ),
  // Discount Factor Explorer — a shrinking-toward-origin curve
  "discount-factor-explorer": (p) => (
    <Base {...p}>
      <path d="M3 4v16h18" />
      <path d="M4 6c4 0 8 3 16 12" />
      <circle cx="4" cy="6" r="1.3" />
      <circle cx="20" cy="18" r="1.3" />
    </Base>
  ),
  // Financial Formula Explorer — an open book/reference
  "formula-explorer": (p) => (
    <Base {...p}>
      <path d="M12 6.5c-1.8-1.3-4-2-6.5-2A2.5 2.5 0 0 0 3 7v11c2.5 0 4.7.7 6.5 2 1.8-1.3 4-2 6.5-2s4 .7 5.5 1.5V7A2.5 2.5 0 0 0 18.5 4.5c-2.5 0-4.7.7-6.5 2Z" />
      <path d="M12 6.5V20" />
    </Base>
  ),
  // Real Return Intelligence Dashboard — layered bars with a divider (nominal → real)
  "real-return-dashboard": (p) => (
    <Base {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 14h18M7 18v-4M12 18v-7M17 18v-10" />
    </Base>
  ),
  // Real Return Calculator — a scale/balance (nominal vs real)
  "real-return-calculator": (p) => (
    <Base {...p}>
      <path d="M12 3v18M5 8l-3 5a3 3 0 0 0 6 0l-3-5ZM19 8l-3 5a3 3 0 0 0 6 0l-3-5Z" />
      <path d="M5 8h14M8 21h8" />
    </Base>
  ),
  // Asset Comparison Lab — bars of different heights with a ranking dot
  "asset-comparison-lab": (p) => (
    <Base {...p}>
      <path d="M4 20V11M10 20V6M16 20V13" />
      <circle cx="10" cy="4" r="1.4" />
    </Base>
  ),
  // Investment Growth Explorer — two diverging growth lines
  "investment-growth-explorer": (p) => (
    <Base {...p}>
      <path d="M3 18l5-4 4 2 8-11" />
      <path d="M3 18l5-8 4 3 8-4" opacity={0.5} />
    </Base>
  ),
  // Portfolio Purchasing Power — a pie/donut slice with a shrinking arrow
  "portfolio-purchasing-power": (p) => (
    <Base {...p}>
      <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
      <path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z" />
      <path d="M16 16l3 3M19 16v3h-3" opacity={0.6} />
    </Base>
  ),
  // Inflation Drag Analyzer — a downward drag arrow on a bar
  "inflation-drag-analyzer": (p) => (
    <Base {...p}>
      <rect x="4" y="4" width="7" height="16" rx="1" />
      <path d="M16 8v10M13 15l3 3 3-3" />
    </Base>
  ),
  // Asset Allocation Explorer — sliders
  "asset-allocation-explorer": (p) => (
    <Base {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="7" cy="18" r="1.8" fill="currentColor" stroke="none" />
    </Base>
  ),
  // Investment Scenario Simulator — branching paths
  "investment-scenario-simulator": (p) => (
    <Base {...p}>
      <circle cx="5" cy="12" r="1.8" />
      <path d="M6.5 12h3M9.5 12l7-6M9.5 12l7 0M9.5 12l7 6" />
      <circle cx="19" cy="6" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
      <circle cx="19" cy="18" r="1.4" />
    </Base>
  ),
  // Inflation Impact — a gauge
  "inflation-impact": (p) => (
    <Base {...p}>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18l4-6" />
      <path d="M4 18h1M19 18h1M12 6v1" />
    </Base>
  ),
  // Savings Erosion — coin stack with a downward arrow
  "savings-erosion": (p) => (
    <Base {...p}>
      <ellipse cx="9" cy="6" rx="6" ry="2.4" />
      <path d="M3 6v5c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V6" />
      <path d="M3 11v5c0 1.3 2.7 2.4 6 2.4 1 0 1.9-.08 2.7-.22" />
      <path d="M18 12v7M15.5 16.5 18 19l2.5-2.5" />
    </Base>
  ),
  // Future Value — clock with a forward arrow
  "future-value": (p) => (
    <Base {...p}>
      <circle cx="10" cy="12" r="7" />
      <path d="M10 8v4l3 2" />
      <path d="M18 9l3 3-3 3" />
    </Base>
  ),
  // Present Value — a calendar/today mark
  "present-value": (p) => (
    <Base {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <circle cx="12" cy="15" r="2" />
    </Base>
  ),
};

export function ToolIcon({ toolId, className = "h-5 w-5" }: { toolId: string; className?: string }) {
  const Icon = ICONS[toolId];
  if (!Icon) return null;
  return <Icon className={className} />;
}
