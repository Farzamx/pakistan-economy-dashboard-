// Pure data preparation for the Budget Tracker's Sankey diagram: it builds the flow graph from the verified detail in src/data/budgetFlows.ts, validates
// the graph and reconciles it to the totals Budget in Brief prints, and computes a deterministic layout where every flow's width is exactly proportional
// to its value. Nothing here renders anything and nothing here does I/O; the component only draws what this module returns.
//
// WHAT THE DIAGRAM SHOWS (one fiscal year, Budget Estimates only, Rs billion)
//   stage 0  revenue sources (income tax, sales tax, customs, federal excise, petroleum levy, State Bank profit, other non-tax) and the two domestic
//            borrowing sources (bank, non-bank)
//   stage 1  gross federal revenue | domestic borrowing | external borrowing (net) | privatisation proceeds   (revenue and financing kept apart)
//   stage 2  total resources: revenue plus financing, the pool everything below is paid from
//   stage 3  allocation: the provinces' NFC share, then each federal expenditure line of Budget in Brief Table 10, then development and net lending
//   stage 4  detail: sub-items of the lines above, only where the document prints them
//
// WHY THERE IS A "TOTAL RESOURCES" NODE. Money is fungible. Linking "borrowing" straight to "interest payments" or "income tax" to "defence" would invent
// a pairing the budget does not state. Every source therefore flows into one pool and every use flows out of it, which is also how Table 1 is built
// (total resources = total expenditure). The pool equals the "budget envelope" used elsewhere in the workshop: total outlay plus the provinces' share.
//
// INTEGRITY RULES (each pinned by budgetSankey.test.ts)
//   - A negative, non-finite or zero flow is never drawn; negative and non-finite are errors, zero is dropped with a warning.
//   - No flow is invented. The only derived amounts are explicit remainders (other non-tax receipts, other grants to others), each flagged `derived`, labelled
//     as remainders, and only ever "printed parent minus printed parts".
//   - Tolerances are derived, not slack: Tables 1 and 2 print whole Rs billion, so each such figure in an identity can be off by 0.5 and an identity of n of
//     them by 0.5 × n; tables printed in Rs million are held to Rs 0.01bn. Anything beyond tolerance is reported as a failed reconciliation and the diagram
//     is not drawn. Differences inside tolerance are still printed in the reconciliation table.
//   - Borrowing is financing, not revenue: gross revenue and financing are separate stage-1 nodes, and a test pins that no revenue node is fed by borrowing.

import { BUDGET_FLOWS, getBudgetFlowRecord, type BudgetFlowRecord } from "@/data/budgetFlows";
import { getYearRecord } from "./budgetData";

export type SankeyStage = 0 | 1 | 2 | 3 | 4;
export type NodeKind = "revenue" | "financing" | "total" | "provincial" | "spending" | "development" | "detail";

export interface NodeComposition {
  label: string;
  /** Rs billion; may be negative here because composition is information, not a drawn flow. */
  value: number;
  note?: string;
}

export interface SankeyNode {
  id: string;
  label: string;
  stage: SankeyStage;
  /** Vertical order inside its stage (ascending). */
  order: number;
  kind: NodeKind;
  /** Key into NODE_COLORS. */
  colorKey: string;
  /** Detail nodes only: the stage-3 node they are a part of. */
  parentId?: string;
  description: string;
  /** The Budget in Brief table(s) the figure comes from. */
  source: string;
  notes?: string[];
  composition?: NodeComposition[];
  /** True for an explicit remainder (printed parent minus printed parts), never for a printed figure. */
  derived?: boolean;
  /** True when several separately printed items are drawn as one block for legibility; their parts are listed in `composition`. */
  grouped?: boolean;
}

export interface SankeyLink {
  id: string;
  source: string;
  target: string;
  /** Rs billion, strictly positive. */
  value: number;
}

export interface SankeyGraph {
  fiscalYear: string;
  estimateType: "BE";
  unit: "Rs billion";
  nodes: SankeyNode[];
  links: SankeyLink[];
  /** Printed Table 1 total expenditure (Rs bn): the base of "% of total outlay". */
  totalOutlay: number;
}

export const NODE_COLORS: Record<string, string> = {
  revenue: "#2dd4bf",
  financing: "#fb923c",
  total: "#94a3b8",
  provincial: "#a855f7",
  interest: "#fb7185",
  defence: "#38bdf8",
  pension: "#818cf8",
  grants: "#f472b6",
  subsidies: "#f59e0b",
  civil: "#9ca3af",
  emergency: "#64748b",
  psdp: "#34d399",
  netLending: "#10b981",
};

export const STAGE_TITLES: Record<SankeyStage, string> = {
  0: "Sources",
  1: "Revenue and financing",
  2: "Total resources",
  3: "Allocation",
  4: "Detail",
};

export const IDS = {
  incomeTax: "rev-income-tax",
  otherDirect: "rev-other-direct",
  salesTax: "rev-sales-tax",
  customs: "rev-customs",
  excise: "rev-excise",
  petroleumLevy: "rev-petroleum-levy",
  sbpProfit: "rev-sbp-profit",
  otherNonTax: "rev-other-non-tax",
  bank: "fin-bank",
  nonBank: "fin-non-bank",
  grossRevenue: "gross-revenue",
  domesticBorrowing: "domestic-borrowing",
  externalBorrowing: "external-borrowing",
  privatisation: "privatisation",
  total: "total-resources",
  provincial: "provincial-share",
  interest: "interest",
  defence: "defence",
  pension: "pension",
  grants: "grants",
  subsidies: "subsidies",
  civil: "civil-government",
  emergency: "emergency",
  psdp: "psdp",
  netLending: "net-lending",
} as const;

const R = (n: number) => Math.round(n * 1000) / 1000;

// ───────────────────────────── graph builder ─────────────────────────────

/**
 * Builds the flow graph for one year from its verified record. Every link value is a figure the document prints, a sum of printed figures, or one of
 * the two flagged remainders. Items with no (or a zero) printed figure get no node and no flow. Nothing is balanced to force a total.
 */
export function buildBudgetFlowGraph(rec: BudgetFlowRecord): SankeyGraph {
  const rv = rec.revenue;
  const f = rec.financing;
  const c = rec.current;
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const node = (n: SankeyNode) => nodes.push(n);
  const link = (source: string, target: string, value: number) => links.push({ id: `${source}>${target}`, source, target, value });

  // ── stage 0: revenue sources ──
  const otherDirect = R(rv.capitalValueTax + rv.workersWelfareFund + rv.workersProfitParticipationFund);
  const otherNonTax = R(rv.printed.nonTaxRevenue - rv.sbpProfit - rv.petroleumLevy);
  node({ id: IDS.incomeTax, label: "Income tax", stage: 0, order: 0, kind: "revenue", colorKey: "revenue", description: "Federal income tax collected by the FBR (direct tax), excluding capital value tax and the two workers' funds.", source: "Table 4: Revenue Receipts" });
  node({
    id: IDS.otherDirect,
    label: "Other direct taxes",
    stage: 0,
    order: 1,
    kind: "revenue",
    colorKey: "revenue",
    description: "The rest of the FBR's direct taxes: capital value tax and the Workers Welfare and Workers Profit Participation Funds.",
    source: "Table 4: Revenue Receipts",
    grouped: true,
    composition: [
      { label: "Capital value tax", value: rv.capitalValueTax },
      { label: "Workers Welfare Fund", value: rv.workersWelfareFund },
      { label: "Workers Profit Participation Fund", value: rv.workersProfitParticipationFund },
    ],
  });
  node({ id: IDS.salesTax, label: "Sales tax", stage: 0, order: 2, kind: "revenue", colorKey: "revenue", description: "Federal sales tax collected by the FBR (indirect tax).", source: "Table 4: Revenue Receipts" });
  node({ id: IDS.customs, label: "Customs duties", stage: 0, order: 3, kind: "revenue", colorKey: "revenue", description: "Customs duties collected by the FBR (indirect tax).", source: "Table 4: Revenue Receipts" });
  node({ id: IDS.excise, label: "Federal excise", stage: 0, order: 4, kind: "revenue", colorKey: "revenue", description: "Federal excise duties collected by the FBR (indirect tax).", source: "Table 4: Revenue Receipts" });
  node({ id: IDS.petroleumLevy, label: "Petroleum levy", stage: 0, order: 5, kind: "revenue", colorKey: "revenue", description: "The petroleum levy, booked by Budget in Brief as non-tax revenue (it is not an FBR tax).", source: "Table 5: Non-Tax Revenue Receipts" });
  node({ id: IDS.sbpProfit, label: "State Bank profit", stage: 0, order: 6, kind: "revenue", colorKey: "revenue", description: "Profit of the State Bank of Pakistan transferred to the federal government, booked as non-tax revenue.", source: "Table 5: Non-Tax Revenue Receipts" });
  if (otherNonTax > 0) {
    node({
      id: IDS.otherNonTax,
      label: "Other non-tax receipts",
      stage: 0,
      order: 7,
      kind: "revenue",
      colorKey: "revenue",
      description: "All other non-tax revenue: fees, royalties, dividends, mark-up, civil-administration receipts and miscellaneous receipts. Derived as the printed non-tax total minus State Bank profit and the petroleum levy.",
      source: "Table 5: Non-Tax Revenue Receipts",
      derived: true,
      notes: ["A remainder: the printed non-tax revenue total less the two items drawn separately. Every item inside it is printed in Table 5."],
    });
  }
  // ── stage 0: domestic borrowing sources ──
  node({ id: IDS.bank, label: "Bank borrowing", stage: 0, order: 8, kind: "financing", colorKey: "financing", description: "Net borrowing from banks through T-bills, Pakistan Investment Bonds and Sukuk. This is financing, not revenue.", source: "Table 1: Budget at a Glance, item IV" });
  node({ id: IDS.nonBank, label: "Non-bank borrowing", stage: 0, order: 9, kind: "financing", colorKey: "financing", description: "Net borrowing outside the banking system: National Savings Schemes and other non-bank sources. This is financing, not revenue.", source: "Table 1: Budget at a Glance, item II" });

  // ── stage 1 ──
  const external = f.external;
  node({
    id: IDS.grossRevenue,
    label: "Gross federal revenue",
    stage: 1,
    order: 0,
    kind: "revenue",
    colorKey: "revenue",
    description: "Everything the federal government collects: FBR taxes plus non-tax receipts, before the provinces' share is deducted.",
    source: "Table 1: Budget at a Glance",
  });
  node({ id: IDS.domesticBorrowing, label: "Domestic borrowing", stage: 1, order: 1, kind: "financing", colorKey: "financing", description: "Net domestic borrowing (bank plus non-bank). Financing, not revenue.", source: "Table 2: Fiscal Deficit & Financing" });
  node({
    id: IDS.externalBorrowing,
    label: "External borrowing",
    stage: 1,
    order: 2,
    kind: "financing",
    colorKey: "financing",
    description: "Net external financing: new foreign loans less repayments of foreign loans and short-term credits. Financing, not revenue.",
    source: "Table 1 (item III), Table 2, Table 9: External Resources (Net)",
    composition: [
      { label: "External receipts (gross)", value: external.receipts },
      { label: "Less repayments of foreign loans", value: -external.loanRepayments },
      { label: "Less repayment of short-term credits", value: -external.shortTermRepayments },
      { label: "Multilateral and bilateral loans (net)", value: external.multilateralBilateral },
      { label: "Commercial loans and bonds (net)", value: external.commercialAndBonds, note: external.commercialAndBonds < 0 ? "A net repayment this year" : undefined },
    ],
    notes: ["Drawn as the printed net figure because Budget in Brief reports external resources net of repayments, and one component can be negative. The gross and repayment amounts are shown here for context and are not additional flows."],
  });
  node({ id: IDS.privatisation, label: "Privatisation proceeds", stage: 1, order: 3, kind: "financing", colorKey: "financing", description: "Budgeted proceeds from privatisation, which Budget in Brief counts as financing, not revenue.", source: "Table 1 (item V), Table 2" });

  // ── stage 2 ──
  node({
    id: IDS.total,
    label: "Total resources",
    stage: 2,
    order: 0,
    kind: "total",
    colorKey: "total",
    description: "Revenue plus financing: the pool the provinces' share and all federal spending are paid from. It equals total federal expenditure plus the provinces' share.",
    source: "Table 1: Budget at a Glance",
    notes: ["Money is fungible. The diagram does not say that any particular source pays for any particular use."],
  });

  // ── stage 3 ──
  node({ id: IDS.provincial, label: "Provincial share (NFC)", stage: 3, order: 0, kind: "provincial", colorKey: "provincial", description: "The provinces' share of federal divisible taxes under the NFC award, deducted from gross revenue before the federal government spends anything.", source: "Table 1: Budget at a Glance, 'Less Provincial Share'" });
  node({ id: IDS.interest, label: "Interest payments", stage: 3, order: 1, kind: "spending", colorKey: "interest", description: "Mark-up (interest) on domestic and foreign debt. This is the cost of borrowing, not repayment of principal.", source: "Table 10: Current Expenditures (i)" });
  node({ id: IDS.defence, label: "Defence", stage: 3, order: 2, kind: "spending", colorKey: "defence", description: "Defence Affairs and Services as Table 10 prints it.", source: "Table 10: Current Expenditures (iii)" });
  node({ id: IDS.pension, label: "Pensions", stage: 3, order: 3, kind: "spending", colorKey: "pension", description: "Military and civil pensions, the federal pension fund and pension increases.", source: "Table 10: Current Expenditures (ii)" });
  node({ id: IDS.grants, label: "Grants and transfers", stage: 3, order: 4, kind: "spending", colorKey: "grants", description: "Grants to provinces and to others, including income support (BISP), AJK, Gilgit-Baltistan and contingent liabilities.", source: "Table 10 (iv), Table 13: Grants and Transfers" });
  node({ id: IDS.subsidies, label: "Subsidies", stage: 3, order: 5, kind: "spending", colorKey: "subsidies", description: "Subsidies to the power sector, food, industries and others.", source: "Table 10 (v), Table 12: Subsidies" });
  node({ id: IDS.civil, label: "Running of government", stage: 3, order: 6, kind: "spending", colorKey: "civil", description: "Running of civil government: the cost of running the federal civil administration.", source: "Table 10: Current Expenditures (vi)" });
  node({ id: IDS.emergency, label: "Emergency provision", stage: 3, order: 7, kind: "spending", colorKey: "emergency", description: "Provision for emergency and others: money set aside for emergencies and other unallocated current expenditure (of which natural-disaster provisions are noted in Table 10).", source: "Table 10: Current Expenditures (vii)" });
  node({ id: IDS.psdp, label: "Development (PSDP)", stage: 3, order: 8, kind: "development", colorKey: "psdp", description: "The federal Public Sector Development Programme.", source: "Table 1: Budget at a Glance, 'Federal PSDP'" });
  node({ id: IDS.netLending, label: "Net lending", stage: 3, order: 9, kind: "development", colorKey: "netLending", description: "Net lending by the federal government (loans and advances less recoveries), part of 'Development & Net Lending'.", source: "Table 1: Budget at a Glance, 'Net Lending'" });

  // ── stage 4: detail, only where the document prints it ──
  const detail = (id: string, label: string, parentId: string, order: number, description: string, source: string, extra: Partial<SankeyNode> = {}) => {
    const parent = nodes.find((n) => n.id === parentId);
    node({ id, label, stage: 4, order, kind: "detail", colorKey: parent?.colorKey ?? "total", parentId, description, source, ...extra });
  };
  const detailLinks: [string, string, number][] = [];
  const add = (id: string, label: string, parent: string, value: number, order: number, description: string, source: string, extra: Partial<SankeyNode> = {}) => {
    if (!(value > 0)) return; // zero or missing: no node, no flow
    detail(id, label, parent, order, description, source, extra);
    detailLinks.push([parent, id, value]);
  };
  // interest
  add("int-domestic", "Domestic debt", IDS.interest, c.interest.domestic, 0, "Mark-up on domestic debt.", "Table 10: Current Expenditures");
  add("int-foreign", "Foreign debt", IDS.interest, c.interest.foreign, 1, "Mark-up on foreign debt.", "Table 10: Current Expenditures");
  // defence
  const d = c.defence;
  add("def-employees", "Employee-related expenses", IDS.defence, d.employees, 2, "Defence services: employee-related expenses.", "Function-wise table (2) Defence Affairs and Services");
  add("def-operating", "Operating expenses", IDS.defence, d.operatingExpenses, 3, "Defence services: operating expenses.", "Function-wise table (2) Defence Affairs and Services");
  add("def-physical", "Physical assets", IDS.defence, d.physicalAssets, 4, "Defence services: physical assets.", "Function-wise table (2) Defence Affairs and Services");
  add("def-civil-works", "Civil works", IDS.defence, d.civilWorks, 5, "Defence services: civil works.", "Function-wise table (2) Defence Affairs and Services");
  // pension
  const p = c.pension;
  add("pen-military", "Military pensions", IDS.pension, p.military, 6, "Pensions of military personnel.", "Table 10: Current Expenditures (ii)");
  add("pen-civil", "Civil pensions", IDS.pension, p.civil, 7, "Pensions of civil employees.", "Table 10: Current Expenditures (ii)");
  add("pen-other", "Pension fund and increases", IDS.pension, R(p.federalPensionFund + p.pensionIncrease), 8, "The Federal Pension Fund allocation and the budgeted pension increase for civil and defence pensioners.", "Table 10: Current Expenditures (ii)", {
    grouped: true,
    composition: [
      { label: "Federal Pension Fund", value: p.federalPensionFund },
      { label: "Pension increase (civil and defence)", value: p.pensionIncrease },
    ],
  });
  // grants
  const g = c.grants;
  const otherGrants = R(g.printedOthers - g.benazirIncomeSupport - g.ajkGovernment - g.gilgitBaltistanGovernment - g.contingentLiabilities);
  add("gr-provinces", "Grants to provinces", IDS.grants, g.provinces, 9, "Special grants to provincial governments.", "Table 13: Grants and Transfers");
  add("gr-bisp", "Income support (BISP)", IDS.grants, g.benazirIncomeSupport, 10, "The Benazir Income Support Programme: federal income support for low-income households.", "Table 13: Grants and Transfers (grants to others)");
  add("gr-ajk-gb", "AJK and Gilgit-Baltistan", IDS.grants, R(g.ajkGovernment + g.gilgitBaltistanGovernment), 11, "Grants to the Azad Jammu and Kashmir and Gilgit-Baltistan governments.", "Table 13: Grants and Transfers (grants to others)", {
    grouped: true,
    composition: [
      { label: "AJK Government", value: g.ajkGovernment },
      { label: "Gilgit-Baltistan Government", value: g.gilgitBaltistanGovernment },
    ],
  });
  add("gr-contingent", "Contingent liabilities", IDS.grants, g.contingentLiabilities, 12, "Provision for contingent liabilities (for example guarantees that may be called).", "Table 13: Grants and Transfers (grants to others)");
  if (otherGrants > 0) {
    add("gr-other", "Other grants to others", IDS.grants, otherGrants, 13, "All other grants to others in Table 13. Derived as the printed grants-to-others total minus the four items drawn separately.", "Table 13: Grants and Transfers (grants to others)", {
      derived: true,
      notes: ["A remainder: the printed total less the items drawn separately. Every item inside it is printed in Table 13."],
    });
  }
  // subsidies
  const s = c.subsidies;
  add("sub-power", "Power sector", IDS.subsidies, s.power, 14, "Subsidies to the power sector (tariff differentials, K-Electric, circular-debt related provisions).", "Table 12: Subsidies");
  add("sub-petroleum", "Petroleum", IDS.subsidies, s.petroleum, 15, "Subsidy to petroleum.", "Table 12: Subsidies");
  add("sub-food", "Food (PASSCO)", IDS.subsidies, s.food, 16, "Subsidy to food (PASSCO).", "Table 12: Subsidies");
  add("sub-industries", "Industries and production", IDS.subsidies, s.industries, 17, "Subsidy to industries and production.", "Table 12: Subsidies");
  add("sub-other", "Other subsidies", IDS.subsidies, s.other, 18, "Other subsidies as Table 12 groups them.", "Table 12: Subsidies");

  // ── links ──
  link(IDS.incomeTax, IDS.grossRevenue, R(rv.incomeTax));
  link(IDS.otherDirect, IDS.grossRevenue, otherDirect);
  link(IDS.salesTax, IDS.grossRevenue, R(rv.salesTax));
  link(IDS.customs, IDS.grossRevenue, R(rv.customsDuties));
  link(IDS.excise, IDS.grossRevenue, R(rv.federalExcise));
  link(IDS.petroleumLevy, IDS.grossRevenue, R(rv.petroleumLevy));
  link(IDS.sbpProfit, IDS.grossRevenue, R(rv.sbpProfit));
  if (otherNonTax > 0) link(IDS.otherNonTax, IDS.grossRevenue, otherNonTax);
  link(IDS.bank, IDS.domesticBorrowing, R(f.bankBorrowing));
  link(IDS.nonBank, IDS.domesticBorrowing, R(f.nonBankBorrowing));

  const grossIn = links.filter((l) => l.target === IDS.grossRevenue).reduce((a, l) => a + l.value, 0);
  link(IDS.grossRevenue, IDS.total, R(grossIn));
  link(IDS.domesticBorrowing, IDS.total, R(f.bankBorrowing + f.nonBankBorrowing));
  link(IDS.externalBorrowing, IDS.total, R(f.externalNet));
  link(IDS.privatisation, IDS.total, R(f.privatisation));

  link(IDS.total, IDS.provincial, R(rv.printed.provincialShare));
  link(IDS.total, IDS.interest, R(c.interest.printedTotal));
  link(IDS.total, IDS.defence, R(c.defence.printedTotal));
  link(IDS.total, IDS.pension, R(c.pension.printedTotal));
  link(IDS.total, IDS.grants, R(c.grants.printedTotal));
  link(IDS.total, IDS.subsidies, R(c.subsidies.printedTotal));
  link(IDS.total, IDS.civil, R(c.runningOfCivilGovernment));
  link(IDS.total, IDS.emergency, R(c.emergencyProvision));
  link(IDS.total, IDS.psdp, R(rec.development.psdp));
  link(IDS.total, IDS.netLending, R(rec.development.netLending));
  for (const [parent, id, value] of detailLinks) link(parent, id, R(value));

  return { fiscalYear: rec.fiscalYear, estimateType: rec.estimateType, unit: "Rs billion", nodes, links, totalOutlay: rec.printedTotalExpenditure };
}

// ───────────────────────────── validation and reconciliation ─────────────────────────────

export type IssueSeverity = "error" | "warning";
export interface SankeyIssue {
  severity: IssueSeverity;
  code:
    | "DUPLICATE_NODE"
    | "DUPLICATE_LINK"
    | "UNKNOWN_NODE"
    | "SELF_LINK"
    | "BACKWARD_LINK"
    | "NON_FINITE_VALUE"
    | "NEGATIVE_VALUE"
    | "ZERO_VALUE"
    | "UNIT_MISMATCH"
    | "ESTIMATE_TYPE"
    | "ORPHAN_NODE"
    | "NODE_IMBALANCE"
    | "MISSING_VALUE"
    | "DETAIL_PARENT"
    | "BORROWING_AS_REVENUE";
  message: string;
  ref?: string;
}

export interface NodeBalance {
  id: string;
  label: string;
  inflow: number;
  outflow: number;
  difference: number;
  tolerance: number;
  ok: boolean;
}

export interface ReconciliationCheck {
  id: string;
  description: string;
  /** What the document prints (or the canonical dataset records). */
  printed: number;
  /** What the parts add up to. */
  computed: number;
  difference: number;
  tolerance: number;
  ok: boolean;
  source: string;
  /** Plain-language explanation of a non-zero difference, shown beside it. Absent when the difference is zero. */
  note?: string;
  /** True when the document's own printed total does not foot to its own printed rows beyond the exact-table tolerance: a gap inside the source, not in this diagram. */
  sourceGap?: boolean;
}

export interface SankeyDiagnostics {
  /** True only when there are no errors and every reconciliation check passes. */
  ok: boolean;
  issues: SankeyIssue[];
  balances: NodeBalance[];
  reconciliation: ReconciliationCheck[];
}

/**
 * Tolerances are derived, not chosen to make checks pass. Tables 1 and 2 print whole Rs billion, so each such figure in an identity can be off by up to
 * Rs 0.5bn and an identity of n of them can disagree by up to 0.5 × n. Tables printed in Rs million (4, 5, 9-13) are held to Rs 0.01bn.
 */
export const WHOLE_BILLION_ROUNDING = 0.5;
export const wholeBillionTolerance = (figures: number) => WHOLE_BILLION_ROUNDING * figures;
/** Tables printed in Rs million, converted to Rs billion. */
export const MILLION_TABLE_TOLERANCE = 0.01;
/**
 * Table 10 prints Rs million, but several rows are plainly rounded (971,000; 389,000; 1,055,000), so its printed total can differ from the sum of its rows
 * by under Rs 0.5bn. FY2025-26's own Table 10 does: its rows add to 16,285.588 against a printed 16,286.045 (difference 0.457). That difference is reported
 * by the reconciliation table, not hidden.
 */
export const ROUNDED_ROWS_TOLERANCE = 0.5;
/**
 * The total-resources node adds four whole-billion financing figures to exact revenue and subtracts a whole-billion provincial share, PSDP and net
 * lending plus Table 10 rows that are rounded, so the pool's inflow and outflow can differ by a few billion rupees without any error: seven whole-billion
 * figures (3.5) plus the Table 10 rounding (0.5).
 */
export const HUB_TOLERANCE = 4;
/** Tolerance when comparing a Rs-million figure with the canonical dataset's whole-billion figure. */
export const CANONICAL_TOLERANCE = 0.5;
const EPS = 1e-9;

function nodeTolerance(n: SankeyNode): number {
  return n.kind === "total" ? HUB_TOLERANCE : MILLION_TABLE_TOLERANCE;
}

/**
 * Structural validation of a flow graph: unique nodes and links, known endpoints, forward-only flows, positive finite values, the declared unit and
 * estimate type, no borrowing flowing into revenue, detail nodes attached to a parent, and conservation at every node that has both inflow and outflow.
 */
export function validateSankeyGraph(graph: SankeyGraph): { ok: boolean; issues: SankeyIssue[]; balances: NodeBalance[] } {
  const issues: SankeyIssue[] = [];
  const err = (code: SankeyIssue["code"], message: string, ref?: string) => issues.push({ severity: "error", code, message, ref });
  const warn = (code: SankeyIssue["code"], message: string, ref?: string) => issues.push({ severity: "warning", code, message, ref });

  if (graph.unit !== "Rs billion") err("UNIT_MISMATCH", `Unit is "${graph.unit}", expected "Rs billion".`);
  if (graph.estimateType !== "BE") err("ESTIMATE_TYPE", `Estimate type is "${graph.estimateType}"; only Budget Estimates may be drawn.`);

  const byId = new Map<string, SankeyNode>();
  for (const n of graph.nodes) {
    if (byId.has(n.id)) err("DUPLICATE_NODE", `Node "${n.id}" is defined more than once.`, n.id);
    byId.set(n.id, n);
  }
  const seen = new Set<string>();
  for (const l of graph.links) {
    const key = `${l.source}>${l.target}`;
    if (seen.has(key)) err("DUPLICATE_LINK", `Link ${key} is defined more than once.`, key);
    seen.add(key);
    const s = byId.get(l.source);
    const t = byId.get(l.target);
    if (!s || !t) {
      err("UNKNOWN_NODE", `Link ${key} points at a node that does not exist.`, key);
      continue;
    }
    if (l.source === l.target) err("SELF_LINK", `Link ${key} starts and ends at the same node.`, key);
    if (t.stage <= s.stage) err("BACKWARD_LINK", `Link ${key} does not move forward through the stages.`, key);
    if (!Number.isFinite(l.value)) err("NON_FINITE_VALUE", `Link ${key} has no usable value.`, key);
    else if (l.value < 0) err("NEGATIVE_VALUE", `Link ${key} is negative (${l.value}); a flow cannot be negative.`, key);
    else if (l.value === 0) warn("ZERO_VALUE", `Link ${key} is zero and would not be visible.`, key);
    if (t.kind === "revenue" && s.kind === "financing") err("BORROWING_AS_REVENUE", `Borrowing node "${s.label}" feeds the revenue node "${t.label}"; borrowing is financing, not revenue.`, key);
  }
  for (const n of graph.nodes) {
    if (n.kind === "detail") {
      const parent = n.parentId ? byId.get(n.parentId) : undefined;
      if (!parent || !graph.links.some((l) => l.source === n.parentId && l.target === n.id)) err("DETAIL_PARENT", `Detail node "${n.label}" is not linked to its parent.`, n.id);
    }
    if (!graph.links.some((l) => l.source === n.id || l.target === n.id)) warn("ORPHAN_NODE", `Node "${n.label}" has no flows.`, n.id);
  }

  const balances: NodeBalance[] = [];
  for (const n of graph.nodes) {
    const inflow = graph.links.filter((l) => l.target === n.id && Number.isFinite(l.value)).reduce((a, l) => a + l.value, 0);
    const outflow = graph.links.filter((l) => l.source === n.id && Number.isFinite(l.value)).reduce((a, l) => a + l.value, 0);
    if (inflow > 0 && outflow > 0) {
      const tolerance = nodeTolerance(n);
      const difference = inflow - outflow;
      const ok = Math.abs(difference) <= tolerance + EPS;
      balances.push({ id: n.id, label: n.label, inflow, outflow, difference, tolerance, ok });
      if (!ok) err("NODE_IMBALANCE", `"${n.label}": inflow Rs ${inflow.toFixed(3)}bn and outflow Rs ${outflow.toFixed(3)}bn differ by Rs ${Math.abs(difference).toFixed(3)}bn (tolerance Rs ${tolerance}bn).`, n.id);
    }
  }
  return { ok: !issues.some((i) => i.severity === "error"), issues, balances };
}

function collectNumbers(value: unknown, path: string, out: { path: string; value: number }[]): void {
  if (typeof value === "number") out.push({ path, value });
  else if (value && typeof value === "object" && !Array.isArray(value)) for (const [k, v] of Object.entries(value)) collectNumbers(v, path ? `${path}.${k}` : k, out);
}

const fmt3 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/**
 * Why a check shows a non-zero difference. Written from the numbers in the check, never a generic excuse: it names which figures are rounded and how large
 * the gap is. A zero (or sub-Rs-1-million) difference has no note.
 */
export function explainDifference(id: string, printed: number, computed: number, difference: number, source: string): string | undefined {
  if (!Number.isFinite(difference) || Math.abs(difference) < 0.0005) return undefined;
  const gap = `Rs ${fmt3(Math.abs(difference))}bn`;
  if (id === "current-total")
    return `Budget in Brief's own Table 10 prints rows that add to Rs ${fmt3(computed)}bn against a printed total of Rs ${fmt3(printed)}bn: a gap of ${gap} inside the source itself. Several rows are printed as round numbers (for example 971,000 and 389,000 million), which suggests the rows are rounded under an exact total. The diagram draws every row exactly as printed and does not adjust any figure; the gap is within the 0.5 tolerance for rounded rows.`;
  if (id === "pool-conservation")
    return `The pool adds whole-billion figures (financing, provincial share, PSDP, net lending) to exact Rs-million ones, and Table 10's rows are rounded, so inflow and outflow can differ by a few billion rupees. This difference (${gap}) is inside the 4bn allowance and nothing was adjusted to close it.`;
  if (id.startsWith("canonical-")) return `The canonical budget dataset records whole Rs billion; the exact figure is printed to the Rs million. Difference ${gap}, inside the 0.5 allowance.`;
  if (id === "external-gross-to-net") return `Table 9 is printed in Rs million, so ${gap} is rounding in the last printed digit of its rows.`;
  if (id === "defence-parts") return `The four printed sub-rows add to ${fmt3(computed)} against ${fmt3(printed)} printed: ${gap} of rounding in the source table.`;
  if (source.includes("Table 1") || source.includes("Table 2") || source.includes("Table 9"))
    return `Table 1 and Table 2 print whole Rs billion, so the printed figures carry up to Rs 0.5bn of rounding each. Difference ${gap}, inside the allowance for this identity.`;
  return `A ${gap} difference inside the allowed tolerance.`;
}

export interface ReconciliationSummary {
  total: number;
  passing: number;
  /** Checks with a non-zero difference (all still inside tolerance if `passing` equals `total`). */
  withDifference: number;
  largest: ReconciliationCheck | null;
  sourceGaps: ReconciliationCheck[];
}

/** Headline numbers for the reconciliation, so the page can state them without re-deriving anything. */
export function summarizeReconciliation(checks: ReconciliationCheck[]): ReconciliationSummary {
  const diff = checks.filter((c) => Number.isFinite(c.difference) && Math.abs(c.difference) >= 0.0005);
  const largest = diff.length ? diff.reduce((a, b) => (Math.abs(b.difference) > Math.abs(a.difference) ? b : a)) : null;
  return { total: checks.length, passing: checks.filter((c) => c.ok).length, withDifference: diff.length, largest, sourceGaps: checks.filter((c) => c.sourceGap) };
}

export interface TransparencySummary {
  derived: { label: string; description: string }[];
  grouped: { label: string; parts: string[] }[];
}

/** Which blocks are remainders and which group separately printed items, for the "what you are looking at" panel. */
export function getTransparencySummary(graph: SankeyGraph): TransparencySummary {
  return {
    derived: graph.nodes.filter((n) => n.derived).map((n) => ({ label: n.label, description: n.notes?.[0] ?? n.description })),
    grouped: graph.nodes.filter((n) => n.grouped).map((n) => ({ label: n.label, parts: (n.composition ?? []).map((c) => c.label) })),
  };
}

/**
 * Reconciles a year's record to the totals its Budget in Brief prints, and (separately labelled) to the canonical budget dataset. Reports every check
 * with its printed figure, the sum of the parts, the difference and the tolerance. It never adjusts a figure.
 */
export function reconcileFlowRecord(rec: BudgetFlowRecord): ReconciliationCheck[] {
  const out: ReconciliationCheck[] = [];
  const check = (id: string, description: string, printed: number, computed: number, tolerance: number, source: string) => {
    const difference = computed - printed;
    const sourceGap = id === "current-total" && Math.abs(difference) > MILLION_TABLE_TOLERANCE;
    out.push({ id, description, printed, computed, difference, tolerance, ok: Number.isFinite(difference) && Math.abs(difference) <= tolerance + EPS, source, note: explainDifference(id, printed, computed, difference, source), sourceGap });
  };
  const rv = rec.revenue;
  const f = rec.financing;
  const c = rec.current;
  const sum = (...xs: number[]) => xs.reduce((a, x) => a + x, 0);

  check("direct-taxes", "Income tax + capital value tax + Workers Welfare Fund + Workers Profit Participation Fund = Direct Taxes", rv.printed.directTaxes, sum(rv.incomeTax, rv.capitalValueTax, rv.workersWelfareFund, rv.workersProfitParticipationFund), MILLION_TABLE_TOLERANCE, "Table 4");
  check("indirect-taxes", "Customs duties + sales tax + federal excise = Indirect Taxes", rv.printed.indirectTaxes, sum(rv.customsDuties, rv.salesTax, rv.federalExcise), MILLION_TABLE_TOLERANCE, "Table 4");
  check("fbr-taxes", "Direct Taxes + Indirect Taxes = FBR taxes", rv.printed.fbrTaxes, sum(rv.printed.directTaxes, rv.printed.indirectTaxes), MILLION_TABLE_TOLERANCE, "Table 4");
  check("non-tax-remainder", "State Bank profit + petroleum levy do not exceed non-tax revenue (remainder is not negative)", rv.printed.nonTaxRevenue, rv.printed.nonTaxRevenue - Math.min(0, rv.printed.nonTaxRevenue - rv.sbpProfit - rv.petroleumLevy), MILLION_TABLE_TOLERANCE, "Table 5");
  check("gross-revenue", "FBR taxes + non-tax revenue = Gross Revenue Receipts", rv.printed.grossRevenue, sum(rv.printed.fbrTaxes, rv.printed.nonTaxRevenue), wholeBillionTolerance(1), "Table 1");
  check("net-revenue", "Gross revenue - provincial share = Net Revenue Receipts", rv.printed.netRevenue, rv.printed.grossRevenue - rv.printed.provincialShare, wholeBillionTolerance(3), "Table 1");
  check("financing-total", "Bank + non-bank + external (net) + privatisation = Total financing", f.printed.total, sum(f.bankBorrowing, f.nonBankBorrowing, f.externalNet, f.privatisation), wholeBillionTolerance(5), "Table 1 and Table 2");
  check("domestic-financing", "Bank + non-bank borrowing = Net Domestic Financing", f.printed.netDomestic, sum(f.bankBorrowing, f.nonBankBorrowing), wholeBillionTolerance(3), "Table 1 and Table 2");
  check("external-table-9", "External financing in Table 1 = External Resources (Net) in Table 9", f.printed.externalNetTable9, f.externalNet, wholeBillionTolerance(1), "Table 1 and Table 9");
  check("external-composition", "Multilateral and bilateral + commercial and bonds = net external financing", f.externalNet, sum(f.external.multilateralBilateral, f.external.commercialAndBonds), wholeBillionTolerance(3), "Table 2");
  check("external-gross-to-net", "External receipts - loan repayments - short-term repayments = External Resources (Net)", f.printed.externalNetTable9, f.external.receipts - f.external.loanRepayments - f.external.shortTermRepayments, MILLION_TABLE_TOLERANCE, "Table 9");
  check("resources", "Net revenue + total financing = Total Resources", rec.printedTotalResources, sum(rv.printed.netRevenue, f.printed.total), wholeBillionTolerance(3), "Table 1");
  check("resources-equal-expenditure", "Total Resources = Total Expenditures", rec.printedTotalExpenditure, rec.printedTotalResources, 0, "Table 1");
  check("expenditure", "Current expenditure + PSDP + net lending = Total Expenditures", rec.printedTotalExpenditure, sum(c.printedTotal, rec.development.psdp, rec.development.netLending), wholeBillionTolerance(3), "Table 1 and Table 10");
  check("current-total", "Interest + pension + defence + grants + subsidies + running of government + emergency = Current Expenditures", c.printedTotal, sum(c.interest.printedTotal, c.pension.printedTotal, c.defence.printedTotal, c.grants.printedTotal, c.subsidies.printedTotal, c.runningOfCivilGovernment, c.emergencyProvision), ROUNDED_ROWS_TOLERANCE, "Table 10");
  check("interest-parts", "Domestic + foreign mark-up = Mark-up Payments", c.interest.printedTotal, sum(c.interest.domestic, c.interest.foreign), MILLION_TABLE_TOLERANCE, "Table 10");
  check("pension-parts", "Military + civil + pension fund + pension increase = Pension", c.pension.printedTotal, sum(c.pension.military, c.pension.civil, c.pension.federalPensionFund, c.pension.pensionIncrease), MILLION_TABLE_TOLERANCE, "Table 10");
  check("defence-parts", "Employees + operating + physical assets + civil works = Defence Services", c.defence.printedTotal, sum(c.defence.employees, c.defence.operatingExpenses, c.defence.physicalAssets, c.defence.civilWorks), MILLION_TABLE_TOLERANCE, "Function-wise table (2)");
  check("grants-parts", "Grants to provinces + grants to others = Grants and Transfers", c.grants.printedTotal, sum(c.grants.provinces, c.grants.printedOthers), MILLION_TABLE_TOLERANCE, "Table 10 and Table 13");
  check("grants-remainder", "The named grants-to-others items do not exceed the grants-to-others total (remainder is not negative)", c.grants.printedOthers, c.grants.printedOthers - Math.min(0, c.grants.printedOthers - c.grants.benazirIncomeSupport - c.grants.ajkGovernment - c.grants.gilgitBaltistanGovernment - c.grants.contingentLiabilities), MILLION_TABLE_TOLERANCE, "Table 13");
  check("subsidies-parts", "Power + petroleum + food + industries + other = Subsidies", c.subsidies.printedTotal, sum(c.subsidies.power, c.subsidies.petroleum, c.subsidies.food, c.subsidies.industries, c.subsidies.other), MILLION_TABLE_TOLERANCE, "Table 12");

  // The canonical dataset records whole-billion figures, so these are held to Rs 0.5bn.
  const canon = getYearRecord(rec.fiscalYear);
  if (canon) {
    const cc = (id: string, label: string, canonical: number, mine: number) => check(`canonical-${id}`, `${label} agrees with the canonical budget dataset`, canonical, mine, CANONICAL_TOLERANCE, "budgetHistorical.ts");
    cc("total-outlay", "Total expenditure", canon.totalOutlay, rec.printedTotalExpenditure);
    cc("fbr", "FBR tax revenue", canon.fbrTaxRevenue, rv.printed.fbrTaxes);
    cc("non-tax", "Non-tax revenue", canon.nonTaxRevenue, rv.printed.nonTaxRevenue);
    cc("provincial", "Provincial share", canon.provincialTransfer, rv.printed.provincialShare);
    cc("interest", "Interest payments", canon.debtServicing ?? NaN, c.interest.printedTotal);
    cc("pension", "Pension", canon.pension ?? NaN, c.pension.printedTotal);
    cc("defence", "Defence", canon.defence, c.defence.printedTotal);
    cc("grants", "Grants and transfers", canon.grantsAndTransfersOther ?? NaN, c.grants.printedTotal);
    cc("subsidies", "Subsidies", canon.subsidies, c.subsidies.printedTotal);
    cc("psdp", "Federal PSDP", canon.federalPsdp, rec.development.psdp);
  } else {
    out.push({ id: "canonical-missing", description: "Year exists in the canonical budget dataset", printed: NaN, computed: NaN, difference: NaN, tolerance: 0, ok: false, source: "budgetHistorical.ts" });
  }
  return out;
}

/** Full diagnostics for a year: structure, node balances, record-level missing values, hub conservation and every reconciliation check. */
export function diagnoseBudgetFlows(rec: BudgetFlowRecord, graph: SankeyGraph): SankeyDiagnostics {
  const structure = validateSankeyGraph(graph);
  const issues = [...structure.issues];
  if (rec.estimateType !== "BE") issues.push({ severity: "error", code: "ESTIMATE_TYPE", message: `Record is "${rec.estimateType}"; only Budget Estimates may be drawn.` });
  const nums: { path: string; value: number }[] = [];
  collectNumbers(rec, "", nums);
  for (const n of nums) if (!Number.isFinite(n.value)) issues.push({ severity: "error", code: "MISSING_VALUE", message: `"${n.path}" has no usable value.`, ref: n.path });
  const reconciliation = reconcileFlowRecord(rec);
  const hub = structure.balances.find((b) => b.id === IDS.total);
  if (hub) reconciliation.push({ id: "pool-conservation", description: "Everything flowing into the total-resources pool = everything flowing out of it", printed: hub.inflow, computed: hub.outflow, difference: hub.outflow - hub.inflow, tolerance: hub.tolerance, ok: hub.ok, source: "Diagram (Tables 1, 2, 4, 5, 10)", note: explainDifference("pool-conservation", hub.inflow, hub.outflow, hub.outflow - hub.inflow, "Diagram"), sourceGap: false });
  const ok = !issues.some((i) => i.severity === "error") && reconciliation.every((r) => r.ok);
  return { ok, issues, balances: structure.balances, reconciliation };
}

export interface PreparedSankeyYear {
  fiscalYear: string;
  graph: SankeyGraph;
  diagnostics: SankeyDiagnostics;
  /** Official document (from the canonical dataset's citation, not duplicated here). */
  sourceUrl: string | null;
  sourceDocument: string;
  sourceTables: string[];
  notes: string[];
}

export function prepareBudgetSankeyYear(rec: BudgetFlowRecord): PreparedSankeyYear {
  const graph = buildBudgetFlowGraph(rec);
  return {
    fiscalYear: rec.fiscalYear,
    graph,
    diagnostics: diagnoseBudgetFlows(rec, graph),
    sourceUrl: getYearRecord(rec.fiscalYear)?.citations.budgetInBrief.url ?? null,
    sourceDocument: rec.document,
    sourceTables: rec.tables,
    notes: rec.notes ?? [],
  };
}

/** Every year that has verified flow detail, newest first. A year that fails validation or reconciliation is still returned (so the page can say why), with `diagnostics.ok` false. */
export function prepareBudgetSankeyYears(records: BudgetFlowRecord[] = BUDGET_FLOWS): PreparedSankeyYear[] {
  return [...records].sort((a, b) => b.fiscalYear.localeCompare(a.fiscalYear)).map(prepareBudgetSankeyYear);
}

export { getBudgetFlowRecord };

// ───────────────────────────── expansion ─────────────────────────────

/** The stage-3 nodes that have detail nodes under them. */
export function getExpandableParents(graph: SankeyGraph): string[] {
  const parents = new Set<string>();
  for (const n of graph.nodes) if (n.kind === "detail" && n.parentId) parents.add(n.parentId);
  return graph.nodes.filter((n) => parents.has(n.id)).map((n) => n.id);
}

/** The graph with detail nodes (and their links) kept only for the expanded parents. */
export function filterGraphByExpansion(graph: SankeyGraph, expanded: ReadonlySet<string>): SankeyGraph {
  const keep = new Set(graph.nodes.filter((n) => n.kind !== "detail" || (n.parentId !== undefined && expanded.has(n.parentId))).map((n) => n.id));
  return { ...graph, nodes: graph.nodes.filter((n) => keep.has(n.id)), links: graph.links.filter((l) => keep.has(l.source) && keep.has(l.target)) };
}

// ───────────────────────────── layout ─────────────────────────────

export interface LayoutOptions {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  nodeWidth: number;
  nodePadding: number;
  /** Drawn height floor for a node whose value would otherwise be sub-pixel. Links are never inflated. */
  minNodeHeight: number;
}

export const DEFAULT_LAYOUT: LayoutOptions = { width: 1200, height: 800, marginTop: 50, marginBottom: 14, marginLeft: 176, marginRight: 250, nodeWidth: 14, nodePadding: 15, minNodeHeight: 2 };

export interface PositionedNode extends SankeyNode {
  x: number;
  y: number;
  /** Drawn height: value × scale, but never below the minimum node height. */
  height: number;
  value: number;
  inflow: number;
  outflow: number;
  column: number;
}

export interface PositionedLink extends SankeyLink {
  /** Exactly value × scale (Rs billion → pixels). */
  width: number;
  x0: number;
  x1: number;
  /** Vertical centre of the ribbon at its source and target ends. */
  y0: number;
  y1: number;
  /** SVG path for the ribbon's centre line (draw with stroke-width = width). */
  path: string;
}

export interface SankeyColumn {
  stage: SankeyStage;
  x: number;
  title: string;
}

export interface SankeyLayout {
  width: number;
  height: number;
  /** Pixels per Rs billion, identical for every flow in the diagram. */
  scale: number;
  nodeWidth: number;
  columns: SankeyColumn[];
  nodes: PositionedNode[];
  links: PositionedLink[];
}

/**
 * Deterministic layout. One scale (pixels per Rs billion) is shared by every flow, so widths are proportional across the whole diagram. Columns are the
 * stages present in the graph, left to right; nodes keep their `order` inside a column and only slide vertically toward the weighted centre of their
 * neighbours, so the ordering you see is the ordering in the data. Node value is the larger of inflow and outflow, so a node that is out of balance by
 * rounding is not shrunk below its flows.
 */
export function layoutSankey(graph: SankeyGraph, options: Partial<LayoutOptions> = {}): SankeyLayout {
  const o = { ...DEFAULT_LAYOUT, ...options };
  const stages = [...new Set(graph.nodes.map((n) => n.stage))].sort((a, b) => a - b) as SankeyStage[];
  const nCols = stages.length;
  const left = o.marginLeft;
  const right = o.width - o.marginRight - o.nodeWidth;
  const columns: SankeyColumn[] = stages.map((stage, i) => ({ stage, x: nCols === 1 ? (left + right) / 2 : left + (i * (right - left)) / (nCols - 1), title: STAGE_TITLES[stage] }));

  const innerTop = o.marginTop;
  const innerH = o.height - o.marginTop - o.marginBottom;

  const nodes: PositionedNode[] = graph.nodes.map((n) => {
    const inflow = graph.links.filter((l) => l.target === n.id).reduce((a, l) => a + l.value, 0);
    const outflow = graph.links.filter((l) => l.source === n.id).reduce((a, l) => a + l.value, 0);
    const column = stages.indexOf(n.stage);
    return { ...n, x: columns[column].x, y: 0, height: 0, value: Math.max(inflow, outflow), inflow, outflow, column };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const cols: PositionedNode[][] = stages.map((_, i) => nodes.filter((n) => n.column === i).sort((a, b) => a.order - b.order));

  // one scale for the whole diagram: the tightest column decides
  let scale = Infinity;
  for (const col of cols) {
    const total = col.reduce((a, n) => a + n.value, 0);
    if (total > 0) scale = Math.min(scale, (innerH - (col.length - 1) * o.nodePadding) / total);
  }
  if (!Number.isFinite(scale) || scale <= 0) scale = 0;
  const drawn = (n: PositionedNode, k: number) => Math.max(n.value * k, o.minNodeHeight);
  // minimum node heights can push a crowded column past the inner height; shrink the scale a little until every column fits
  for (let guard = 0; guard < 60 && scale > 0; guard++) {
    const worst = Math.max(...cols.map((col) => col.reduce((a, n) => a + drawn(n, scale), 0) + (col.length - 1) * o.nodePadding));
    if (worst <= innerH + 1e-6) break;
    scale *= 0.985;
  }
  for (const n of nodes) n.height = drawn(n, scale);

  const place = (col: PositionedNode[]) => {
    let y = innerTop;
    for (const n of col) {
      n.y = Math.max(n.y, y);
      y = n.y + n.height + o.nodePadding;
    }
    let limit = innerTop + innerH;
    for (let i = col.length - 1; i >= 0; i--) {
      col[i].y = Math.min(col[i].y, limit - col[i].height);
      limit = col[i].y - o.nodePadding;
    }
    // the upward pass can push the first node above the top edge only if the column does not fit; clamp (the scale loop above prevents that)
    let y2 = innerTop;
    for (const n of col) {
      n.y = Math.max(n.y, y2);
      y2 = n.y + n.height + o.nodePadding;
    }
  };
  // initial positions: each column centred
  for (const col of cols) {
    const total = col.reduce((a, n) => a + n.height, 0) + (col.length - 1) * o.nodePadding;
    let y = innerTop + Math.max(0, (innerH - total) / 2);
    for (const n of col) {
      n.y = y;
      y += n.height + o.nodePadding;
    }
  }
  const centre = (n: PositionedNode) => n.y + n.height / 2;
  for (let iter = 0; iter < 10; iter++) {
    for (let i = 1; i < cols.length; i++) {
      for (const n of cols[i]) {
        const ins = graph.links.filter((l) => l.target === n.id);
        const w = ins.reduce((a, l) => a + l.value, 0);
        if (w > 0) n.y = ins.reduce((a, l) => a + centre(byId.get(l.source)!) * l.value, 0) / w - n.height / 2;
      }
      place(cols[i]);
    }
    for (let i = cols.length - 2; i >= 0; i--) {
      for (const n of cols[i]) {
        const outs = graph.links.filter((l) => l.source === n.id);
        const w = outs.reduce((a, l) => a + l.value, 0);
        if (w > 0) n.y = outs.reduce((a, l) => a + centre(byId.get(l.target)!) * l.value, 0) / w - n.height / 2;
      }
      place(cols[i]);
    }
  }

  // ribbons: stack each node's outgoing links (ordered by target height) and incoming links (ordered by source height)
  const sy = new Map<string, number>();
  const ty = new Map<string, number>();
  for (const n of nodes) {
    let y = n.y;
    for (const l of graph.links.filter((l) => l.source === n.id).sort((a, b) => centre(byId.get(a.target)!) - centre(byId.get(b.target)!))) {
      sy.set(l.id, y);
      y += l.value * scale;
    }
    y = n.y;
    for (const l of graph.links.filter((l) => l.target === n.id).sort((a, b) => centre(byId.get(a.source)!) - centre(byId.get(b.source)!))) {
      ty.set(l.id, y);
      y += l.value * scale;
    }
  }
  const links: PositionedLink[] = graph.links.map((l) => {
    const s = byId.get(l.source)!;
    const t = byId.get(l.target)!;
    const width = l.value * scale;
    const x0 = s.x + o.nodeWidth;
    const x1 = t.x;
    const y0 = (sy.get(l.id) ?? s.y) + width / 2;
    const y1 = (ty.get(l.id) ?? t.y) + width / 2;
    const mid = (x0 + x1) / 2;
    return { ...l, width, x0, x1, y0, y1, path: `M${x0.toFixed(2)},${y0.toFixed(2)}C${mid.toFixed(2)},${y0.toFixed(2)} ${mid.toFixed(2)},${y1.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}` };
  });
  return { width: o.width, height: o.height, scale, nodeWidth: o.nodeWidth, columns, nodes, links };
}

// ───────────────────────────── selection, details and tables ─────────────────────────────

/** The links touching a node and the nodes at their other ends, for highlighting. */
export function getConnections(graph: SankeyGraph, nodeId: string): { linkIds: Set<string>; nodeIds: Set<string> } {
  const linkIds = new Set<string>();
  const nodeIds = new Set<string>([nodeId]);
  for (const l of graph.links) {
    if (l.source === nodeId || l.target === nodeId) {
      linkIds.add(l.id);
      nodeIds.add(l.source);
      nodeIds.add(l.target);
    }
  }
  return { linkIds, nodeIds };
}

export interface FlowEnd {
  nodeId: string;
  label: string;
  value: number;
  /** Share of the selected node's value. */
  pctOfNode: number;
}

export interface NodeDetail {
  node: SankeyNode;
  value: number;
  /** The node this one is a part of, and its share of that node. Null for the total-resources node. */
  parent: { id: string; label: string; pct: number } | null;
  /** Share of total resources (the budget envelope). */
  pctOfTotalResources: number;
  /** Share of total federal expenditure (Table 1), for federal spending and its detail only. */
  pctOfOutlay: number | null;
  incoming: FlowEnd[];
  outgoing: FlowEnd[];
}

const nodeValue = (graph: SankeyGraph, id: string): number => {
  const inflow = graph.links.filter((l) => l.target === id).reduce((a, l) => a + l.value, 0);
  const outflow = graph.links.filter((l) => l.source === id).reduce((a, l) => a + l.value, 0);
  return Math.max(inflow, outflow);
};

/** Amount, shares and neighbours of one node. Null for an unknown id. */
export function getNodeDetail(graph: SankeyGraph, nodeId: string): NodeDetail | null {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const value = nodeValue(graph, nodeId);
  const total = nodeValue(graph, IDS.total);
  let parentId: string | null = null;
  if (node.kind === "detail") parentId = node.parentId ?? null;
  else if (node.stage === 3 || node.stage === 1) parentId = IDS.total;
  else if (node.stage === 0) parentId = graph.links.find((l) => l.source === nodeId)?.target ?? null;
  const parentNode = parentId ? graph.nodes.find((n) => n.id === parentId) : undefined;
  const parentValue = parentId ? nodeValue(graph, parentId) : 0;
  const spendingDetail = node.kind === "spending" || node.kind === "development" || node.kind === "detail";
  const toEnd = (l: SankeyLink, otherId: string): FlowEnd => ({ nodeId: otherId, label: graph.nodes.find((n) => n.id === otherId)?.label ?? otherId, value: l.value, pctOfNode: value > 0 ? (l.value / value) * 100 : 0 });
  return {
    node,
    value,
    parent: parentNode && parentValue > 0 ? { id: parentNode.id, label: parentNode.label, pct: (value / parentValue) * 100 } : null,
    pctOfTotalResources: total > 0 ? (value / total) * 100 : 0,
    pctOfOutlay: spendingDetail && graph.totalOutlay > 0 ? (value / graph.totalOutlay) * 100 : null,
    incoming: graph.links.filter((l) => l.target === nodeId).map((l) => toEnd(l, l.source)),
    outgoing: graph.links.filter((l) => l.source === nodeId).map((l) => toEnd(l, l.target)),
  };
}

export interface FlowTableRow {
  id: string;
  from: string;
  to: string;
  stageFrom: string;
  stageTo: string;
  value: number;
  /** Share of the source node's total. */
  pctOfSource: number;
  pctOfTotalResources: number;
}

/** One row per flow, for the accessible table alternative. */
export function getFlowTableRows(graph: SankeyGraph): FlowTableRow[] {
  const total = nodeValue(graph, IDS.total);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  return [...graph.links]
    .sort((a, b) => byId.get(a.source)!.stage - byId.get(b.source)!.stage || byId.get(a.source)!.order - byId.get(b.source)!.order || byId.get(a.target)!.order - byId.get(b.target)!.order)
    .map((l) => {
      const s = byId.get(l.source)!;
      const t = byId.get(l.target)!;
      const sv = nodeValue(graph, l.source);
      return { id: l.id, from: s.label, to: t.label, stageFrom: STAGE_TITLES[s.stage], stageTo: STAGE_TITLES[t.stage], value: l.value, pctOfSource: sv > 0 ? (l.value / sv) * 100 : 0, pctOfTotalResources: total > 0 ? (l.value / total) * 100 : 0 };
    });
}

export interface StageGroup {
  stage: SankeyStage;
  title: string;
  nodes: { id: string; label: string; value: number; pctOfTotalResources: number; kind: NodeKind; colorKey: string; derived: boolean }[];
}

/** The graph grouped by stage, for the mobile stage-by-stage view. */
export function getStageGroups(graph: SankeyGraph): StageGroup[] {
  const total = nodeValue(graph, IDS.total);
  const stages = [...new Set(graph.nodes.map((n) => n.stage))].sort((a, b) => a - b) as SankeyStage[];
  return stages.map((stage) => ({
    stage,
    title: STAGE_TITLES[stage],
    nodes: graph.nodes
      .filter((n) => n.stage === stage)
      .sort((a, b) => a.order - b.order)
      .map((n) => {
        const value = nodeValue(graph, n.id);
        return { id: n.id, label: n.label, value, pctOfTotalResources: total > 0 ? (value / total) * 100 : 0, kind: n.kind, colorKey: n.colorKey, derived: !!n.derived };
      }),
  }));
}
