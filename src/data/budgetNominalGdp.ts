// Nominal GDP exactly as Pakistan's Budget in Brief PRINTS it for a budget year (Rs billion), for the years where it is printed.
//
// WHY THIS FILE EXISTS. "% of GDP" views of the budget need a GDP figure. Before this file the Budget Workshop derived one for every year from two
// other printed numbers (fiscal deficit in Rs and as a % of GDP): GDP = deficit ÷ (deficit % ÷ 100). That is arithmetically exact only if the printed
// percentage were exact; it is printed to one decimal place, so the implied GDP can be off by up to about ±1.4% (at a 3.6% deficit). Where Budget in
// Brief prints the nominal GDP it used for the budget, that printed figure is used instead and is cited here. For years before FY2019-20 no explicit
// nominal-GDP figure for the budget year could be read from the document, so the implied figure is still used there and is labelled as implied.
//
// Every figure is the GDP assumption of that year's BUDGET (the "Budget" column), not a later revision or the Pakistan Bureau of Statistics' own
// national-accounts GDP, which is published on a different basis and date. It is only ever used to scale budget figures from the same document.
//
// Read from the text of each official PDF (www.finance.gov.pk) on 2026-11-11 and cross-checked against the document's own Fiscal Deficit rows:
//   deficit ÷ GDP agrees with the printed deficit % of GDP to within the rounding of that percentage in every year below (see budgetData.test.ts).

export interface NominalGdpRecord {
  /** "2022-23" */
  fiscalYear: string;
  /** Nominal GDP, Rs billion, the budget-year ("Budget" column) figure. */
  valueRsBn: number;
  /** The document it was read from, and where in it. */
  document: string;
  table: string;
  note?: string;
}

export const BUDGET_NOMINAL_GDP: NominalGdpRecord[] = [
  { fiscalYear: "2019-20", valueRsBn: 44003, document: "Budget in Brief 2019-20", table: "Macro-economic framework table, 'GDP at market prices (Billions)' (columns 38,559 | 44,003 | 49,568)", note: "Repeated as the Budget 2019-20 comparator ('Memo: GDP', 44,003 against a revised 41,727) in the Budget in Brief 2020-21." },
  { fiscalYear: "2020-21", valueRsBn: 45567, document: "Budget in Brief 2020-21", table: "Table 3 (Budget 2020-21 column, 'Memo: GDP')", note: "The text layer scrambles this column; the figure also appears in the Budget in Brief 2021-22 text as the projected FY2021 GDP ('from Rs45,567 billion')." },
  { fiscalYear: "2021-22", valueRsBn: 53867, document: "Budget in Brief 2021-22", table: "Table 3 'Nominal GDP' (Budget 2021-22 column)" },
  { fiscalYear: "2022-23", valueRsBn: 78197, document: "Budget in Brief 2022-23", table: "Table 3 'Nominal GDP' (Budget 2022-23 column)" },
  { fiscalYear: "2023-24", valueRsBn: 105817, document: "Budget in Brief 2023-24", table: "Table 3 'Nominal GDP' (Budget 2023-24 column)" },
  { fiscalYear: "2024-25", valueRsBn: 124150, document: "Budget in Brief 2024-25", table: "Table 3 'Nominal GDP' (Budget 2024-25 column)" },
  { fiscalYear: "2025-26", valueRsBn: 129567, document: "Budget in Brief 2025-26", table: "Table 3 'Nominal GDP' (Budget 2025-26 column)" },
  { fiscalYear: "2026-27", valueRsBn: 143604, document: "Budget in Brief 2026-27", table: "Table 3 'Nominal GDP' (Budget 2026-27 column)", note: "The text layer of this PDF scrambles the Budget 2026-27 column of Table 3; the figure sits on the 'Federal Budget Deficit' text row but belongs to the Nominal GDP row (its neighbours -5,226 and -3.6% are the Overall Fiscal Deficit and its % of GDP, and 5,226 ÷ 143,604 = 3.64%)." },
];

export function getStatedNominalGdp(fiscalYear: string): NominalGdpRecord | undefined {
  return BUDGET_NOMINAL_GDP.find((r) => r.fiscalYear === fiscalYear);
}
