// The detail behind the Budget Tracker's Sankey diagram: how each year's Budget Estimate is financed (revenue by source, borrowing, privatisation) and
// where it goes (provincial share, current expenditure items, development) at a finer grain than src/data/budgetHistorical.ts holds.
//
// WHY A SEPARATE FILE. budgetHistorical.ts is the canonical 17-year summary and is deliberately left untouched. A Sankey needs revenue by tax, financing by
// source and spending sub-items, which that file does not carry. Nothing here duplicates a canonical figure as the source of truth: budgetSankey.test.ts
// checks every overlapping figure (tax revenue, non-tax revenue, provincial share, interest, pension, defence, subsidies, grants, PSDP, total outlay)
// against budgetHistorical.ts, so the two cannot drift apart.
//
// RULES
//   - Budget Estimates only (the "Budget" column of the year's OWN Budget in Brief). Revised Estimates and actuals are never read.
//   - Every number is Rs billion. Tables 4, 5, 9-13 print Rs million and are stored to three decimals (Rs million ÷ 1,000); Tables 1 and 2 print whole
//     Rs billion, so those figures carry up to ±0.5 of rounding (see budgetSankey.ts for how reconciliation tolerances treat that).
//   - A figure that is not printed is not here. Nothing is estimated, apportioned or balanced to force a total: where the document does not print an
//     item, the diagram shows the printed parent only, or an explicitly derived remainder labelled as one (see "derived" in budgetSankey.ts).
//   - The "printed" figures are the totals the document itself prints, kept apart from their parts so the parts can be reconciled to them.
//
// HOW THE FIGURES WERE READ. The text layer of these PDFs scrambles tables, so each table was rebuilt from the position of every word on the page
// (pdf.js text items grouped by row), not from text order, and each row's printed "Budget <year>" column was read. Every group below was confirmed to sum
// to the printed parent. FY2025-26 was read from its own document and independently matched against the FY2025-26 comparator column printed in the
// FY2026-27 document. Read on 2026-11-12.
//
// FY2025-26 has a negative component (commercial and Euro bond financing was a net repayment). A Sankey cannot draw a negative flow, so external
// financing is drawn as its printed net figure only, and its composition is carried in `external` for the node's details.

export interface BudgetFlowRecord {
  /** "2026-27" */
  fiscalYear: string;
  /** Budget Estimates only. */
  estimateType: "BE";
  /** Name of the document every figure below was read from. */
  document: string;
  revenue: {
    // Table 4: FBR taxes
    incomeTax: number;
    capitalValueTax: number;
    workersWelfareFund: number;
    workersProfitParticipationFund: number;
    customsDuties: number;
    salesTax: number;
    federalExcise: number;
    // Table 5: non-tax revenue (only the two largest named items are drawn; the rest is the printed total minus these)
    sbpProfit: number;
    petroleumLevy: number;
    printed: {
      /** Table 4 "Direct Taxes". */
      directTaxes: number;
      /** Table 4 "Indirect Taxes". */
      indirectTaxes: number;
      /** Table 4 / Table 1 "Tax Revenue (FBR)". */
      fbrTaxes: number;
      /** Table 5 "Total (A+B+C+D)". */
      nonTaxRevenue: number;
      /** Table 1 "Gross Revenue Receipts". */
      grossRevenue: number;
      /** Table 1 "Less Provincial Share". */
      provincialShare: number;
      /** Table 1 "Net Revenue Receipts". */
      netRevenue: number;
    };
  };
  financing: {
    // Table 1 items II, III, IV, V (whole Rs billion)
    bankBorrowing: number;
    nonBankBorrowing: number;
    /** Net of repayments (Table 1 item III, Table 9). */
    externalNet: number;
    privatisation: number;
    printed: {
      /** Table 1 "Total (II + III + IV + V)" and Table 2 "Total Financing". */
      total: number;
      /** Table 2 "Net Domestic Financing". */
      netDomestic: number;
      /** Table 9 "External Resources (Net)" in Rs billion to three decimals. */
      externalNetTable9: number;
    };
    /** Composition of net external financing, kept out of the diagram's links because a component can be negative. */
    external: {
      /** Table 2 "Multilateral & Bilateral Sources". */
      multilateralBilateral: number;
      /** Table 2 "Commercial & Bonds" (negative when repayments exceed new borrowing). */
      commercialAndBonds: number;
      /** Table 9 "External Receipts". */
      receipts: number;
      /** Table 9 "Foreign Loans and Repayments" (shown positive; it is deducted). */
      loanRepayments: number;
      /** Table 9 "Repayment of Short Term Credits" (shown positive; it is deducted). */
      shortTermRepayments: number;
    };
  };
  current: {
    /** Table 10 (i) Mark-up Payments. */
    interest: { domestic: number; foreign: number; printedTotal: number };
    /** Table 10 (ii) Pension. */
    pension: { military: number; civil: number; federalPensionFund: number; pensionIncrease: number; printedTotal: number };
    /** Table 10 (iii) Defence Affairs and Services, which is the "Defence Services" line of the function table, split by the function table's own sub-rows. */
    defence: { employees: number; operatingExpenses: number; physicalAssets: number; civilWorks: number; printedTotal: number };
    /** Table 10 (iv) Grants and Transfers, with the largest named items of Table 13. */
    grants: {
      provinces: number;
      benazirIncomeSupport: number;
      ajkGovernment: number;
      gilgitBaltistanGovernment: number;
      contingentLiabilities: number;
      printedOthers: number;
      printedTotal: number;
    };
    /** Table 10 (v) Subsidies, split by Table 12's own category headings. */
    subsidies: { power: number; petroleum: number; food: number; industries: number; other: number; printedTotal: number };
    /** Table 10 (vi). */
    runningOfCivilGovernment: number;
    /** Table 10 (vii) Provision for Emergency and others. */
    emergencyProvision: number;
    /** Table 10 "Current Expenditures (i to vii)". */
    printedTotal: number;
  };
  development: {
    /** Table 1 "Federal PSDP". */
    psdp: number;
    /** Table 1 "Net Lending". */
    netLending: number;
  };
  /** Table 1 "Total Expenditures (A+B)" and "Total Resources". */
  printedTotalExpenditure: number;
  printedTotalResources: number;
  /** The tables of the document the figures were read from, for the source line. */
  tables: string[];
  notes?: string[];
}

export const BUDGET_FLOWS: BudgetFlowRecord[] = [
  {
    fiscalYear: "2025-26",
    estimateType: "BE",
    document: "Budget in Brief 2025-26",
    revenue: {
      incomeTax: 6811.243,
      capitalValueTax: 17.192,
      workersWelfareFund: 25.74,
      workersProfitParticipationFund: 47.825,
      customsDuties: 1588,
      salesTax: 4753,
      federalExcise: 888,
      sbpProfit: 2400,
      petroleumLevy: 1468.395,
      printed: { directTaxes: 6902, indirectTaxes: 7229, fbrTaxes: 14131, nonTaxRevenue: 5147.09, grossRevenue: 19278, provincialShare: 8206, netRevenue: 11072 },
    },
    financing: {
      bankBorrowing: 3435,
      nonBankBorrowing: 2874,
      externalNet: 106,
      privatisation: 87,
      printed: { total: 6501, netDomestic: 6309, externalNetTable9: 105.523 },
      external: { multilateralBilateral: 460, commercialAndBonds: -355, receipts: 5777.554, loanRepayments: 5472.222, shortTermRepayments: 199.81 },
    },
    current: {
      interest: { domestic: 7197.335, foreign: 1009.322, printedTotal: 8206.657 },
      pension: { military: 742, civil: 243, federalPensionFund: 4.3, pensionIncrease: 65.7, printedTotal: 1055 },
      defence: { employees: 846.032, operatingExpenses: 704.399, physicalAssets: 663.077, civilWorks: 336.492, printedTotal: 2550 },
      grants: { provinces: 150, benazirIncomeSupport: 716, ajkGovernment: 140, gilgitBaltistanGovernment: 80, contingentLiabilities: 300, printedOthers: 1777.895, printedTotal: 1927.895 },
      subsidies: { power: 1036.136, petroleum: 1.2, food: 20, industries: 24, other: 104.7, printedTotal: 1186.036 },
      runningOfCivilGovernment: 971,
      emergencyProvision: 389,
      printedTotal: 16286.045,
    },
    development: { psdp: 1000, netLending: 287 },
    printedTotalExpenditure: 17573,
    printedTotalResources: 17573,
    tables: ["Table 1: Budget at a Glance", "Table 2: Fiscal Deficit & Financing", "Table 4: Revenue Receipts", "Table 5: Non-Tax Revenue Receipts", "Table 9: External Resources (Net)", "Table 10: Current Expenditures", "Table 12: Subsidies", "Table 13: Grants and Transfers", "Function-wise table (2) Defence Affairs and Services"],
    notes: ["External financing is the printed net figure: multilateral and bilateral loans of Rs 460bn less a net Rs 355bn of commercial and Euro bond repayments."],
  },
  {
    fiscalYear: "2026-27",
    estimateType: "BE",
    document: "Budget in Brief 2026-27",
    revenue: {
      incomeTax: 7480.521,
      capitalValueTax: 26.581,
      workersWelfareFund: 22.318,
      workersProfitParticipationFund: 83.58,
      customsDuties: 1651,
      salesTax: 4927,
      federalExcise: 1073,
      sbpProfit: 1435.75,
      petroleumLevy: 1676.509,
      printed: { directTaxes: 7613, indirectTaxes: 7651, fbrTaxes: 15264, nonTaxRevenue: 5335.598, grossRevenue: 20600, provincialShare: 8848, netRevenue: 11751 },
    },
    financing: {
      bankBorrowing: 4012,
      nonBankBorrowing: 2034,
      externalNet: 813,
      privatisation: 161,
      printed: { total: 7020, netDomestic: 6046, externalNetTable9: 813.057 },
      external: { multilateralBilateral: 30, commercialAndBonds: 783, receipts: 6779.624, loanRepayments: 5836.275, shortTermRepayments: 130.292 },
    },
    current: {
      interest: { domestic: 6982.607, foreign: 1071.393, printedTotal: 8054 },
      pension: { military: 822, civil: 272.5, federalPensionFund: 10, pensionIncrease: 64.5, printedTotal: 1169 },
      defence: { employees: 967.548, operatingExpenses: 743.462, physicalAssets: 925.833, civilWorks: 363.158, printedTotal: 3000 },
      grants: { provinces: 152, benazirIncomeSupport: 838, ajkGovernment: 146, gilgitBaltistanGovernment: 88, contingentLiabilities: 319.5, printedOthers: 2528.417, printedTotal: 2680.417 },
      subsidies: { power: 830, petroleum: 0, food: 19, industries: 37, other: 205, printedTotal: 1091 },
      runningOfCivilGovernment: 1071,
      emergencyProvision: 430,
      printedTotal: 17495.417,
    },
    development: { psdp: 1000, netLending: 276 },
    printedTotalExpenditure: 18771,
    printedTotalResources: 18771,
    tables: ["Table 1: Budget at a Glance", "Table 2: Fiscal Deficit & Financing", "Table 4: Revenue Receipts", "Table 5: Non-Tax Revenue Receipts", "Table 9: External Resources (Net)", "Table 10: Current Expenditures", "Table 12: Subsidies", "Table 13: Grants and Transfers", "Table 11 / (2) Defence Affairs and Services"],
    notes: ["The 'Subsidy to Petroleum' line is not budgeted for FY2026-27 (printed as a dash), so it has no flow."],
  },
];

export function getBudgetFlowRecord(fiscalYear: string): BudgetFlowRecord | undefined {
  return BUDGET_FLOWS.find((r) => r.fiscalYear === fiscalYear);
}
