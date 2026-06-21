// Pakistan's federal budget, FY2010-11 through FY2026-27, transcribed by hand
// from each year's own official "Budget in Brief" PDF (Finance Division,
// www.finance.gov.pk) — the same no-API-key, verified-source approach as
// externalDebt.ts and quarterlyGdp.ts, except these source documents are
// PDF-only (no machine-readable workbook exists for this data), so this
// dataset is a one-time-per-year manual transcription rather than a live
// fetch. See budgetData.ts for how this is consumed.
//
// Every figure below is the Budget Estimate (BE) for that fiscal year, taken
// only from that year's own document — never a Revised Estimate or a later
// restatement. Mixing estimate types within one trend line would make
// year-over-year comparisons internally inconsistent.
//
// Fiscal Deficit % of GDP comes from each document's own "Table 3: BE & RE
// Comparison" (or equivalent older-format "Working of Fiscal Deficit and
// Financing" table) — Budget in Brief states this directly, so no separate
// Fiscal Policy Statement source is needed.
//
// Two classification notes that affect specific fields:
// - Federal Education / Federal Health are CURRENT EXPENDITURE ONLY, from
//   the Function-Wise Expenditure table's "Education Affairs and Services"
//   and "Health Affairs & Services" rows. PSDP development spending tagged
//   to these sectors is booked separately and is NOT included here — adding
//   it in would mix two different classification bases. Education and
//   health are also primarily provincial responsibilities since the 18th
//   Amendment (2010); these are federal-only figures, never total national
//   spending. See budgetRegistry.ts for the user-facing disclaimer copy.
// - FY2010-11 used an older table format that does not separately itemize
//   Interest Payments, Pension, or "Grants and Transfers to Provinces &
//   Others" — they are bundled into "General Public Service" in that one
//   year's functional classification. Rather than estimate a split, those
//   three fields are null for FY2010-11 only, with the reason recorded in
//   `notes`.

export interface BudgetCitation {
  document: "Budget in Brief";
  url: string;
  /** Table names as printed in the source document, for traceability. */
  tables: string[];
}

export interface BudgetYearRecord {
  /** "2010-11" */
  fiscalYear: string;
  /** Every figure is a Budget Estimate — never Revised or Actual. */
  estimateType: "BE";

  totalOutlay: number;
  fbrTaxRevenue: number;
  nonTaxRevenue: number;
  /** Provincial share of the divisible pool (NFC Award). */
  provincialTransfer: number;
  /** Supplementary grants & transfers to provinces and others — distinct from the NFC divisible-pool share above. */
  grantsAndTransfersOther: number | null;
  federalPsdp: number;
  defence: number;
  /** Interest Payments. */
  debtServicing: number | null;
  pension: number | null;
  subsidies: number;
  /** Current expenditure only — see file header note. */
  federalEducation: number;
  /** Current expenditure only — see file header note. */
  federalHealth: number;
  /** Overall Fiscal Deficit (federal + provincial consolidated), Rs billion. */
  fiscalDeficitRs: number;
  fiscalDeficitPctGdp: number;

  citations: {
    budgetInBrief: BudgetCitation;
  };
  notes?: string;
}

export interface BudgetHistoricalDataset {
  currency: "PKR";
  unit: "billion";
  years: BudgetYearRecord[];
}

function bib(url: string, tables: string[]): { budgetInBrief: BudgetCitation } {
  return { budgetInBrief: { document: "Budget in Brief", url, tables } };
}

export const BUDGET_HISTORICAL: BudgetHistoricalDataset = {
  currency: "PKR",
  unit: "billion",
  years: [
    {
      fiscalYear: "2010-11",
      estimateType: "BE",
      totalOutlay: 2764.4,
      fbrTaxRevenue: 1667,
      nonTaxRevenue: 632.3,
      provincialTransfer: 1033.6,
      grantsAndTransfersOther: null,
      federalPsdp: 290.0,
      defence: 442.2,
      debtServicing: null,
      pension: null,
      subsidies: 126.683,
      federalEducation: 34.5,
      federalHealth: 7.3,
      fiscalDeficitRs: 684.9,
      fiscalDeficitPctGdp: 4.0,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_in_Brief_2010_11.pdf",
        ["Budget at a Glance", "Table 15: Current Expenditure (Summary)", "Subsidies", "Overall Fiscal Deficit 2010-11"],
      ),
      notes: "Interest Payments, Pension, and Grants & Transfers to Provinces & Others are not separately itemized in this year's table — bundled within General Public Service (Rs 1,387.7bn). Recorded as null rather than estimated.",
    },
    {
      fiscalYear: "2011-12",
      estimateType: "BE",
      totalOutlay: 2767,
      fbrTaxRevenue: 1952,
      nonTaxRevenue: 658,
      provincialTransfer: 1203,
      grantsAndTransfersOther: 295,
      federalPsdp: 300,
      defence: 495,
      debtServicing: 791,
      pension: 96,
      subsidies: 166,
      federalEducation: 39.513,
      federalHealth: 2.646,
      fiscalDeficitRs: 724,
      fiscalDeficitPctGdp: 3.4,
      citations: bib(
        "https://www.finance.gov.pk/budget/BudgetinBrief_2011_12.pdf",
        ["Budget at a Glance", "Function-Wise Expenditure (Summary)", "Working of Fiscal Deficit and Financing"],
      ),
      notes: "Federal Health drops sharply from FY2010-11 (Rs 7.3bn to Rs 2.6bn) — this coincides with the 18th Amendment's devolution of health to the provinces, not a transcription error.",
    },
    {
      fiscalYear: "2012-13",
      estimateType: "BE",
      totalOutlay: 2960,
      fbrTaxRevenue: 2381,
      nonTaxRevenue: 730,
      provincialTransfer: 1459,
      grantsAndTransfersOther: 312,
      federalPsdp: 360,
      defence: 545,
      debtServicing: 926,
      pension: 129,
      subsidies: 209,
      federalEducation: 47.874,
      federalHealth: 7.845,
      fiscalDeficitRs: 1105,
      fiscalDeficitPctGdp: 4.7,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_in_Brief_2012_13.pdf",
        ["Budget at a Glance", "Function-Wise Expenditure (Summary)", "Working of Fiscal Deficit and Financing"],
      ),
    },
    {
      fiscalYear: "2013-14",
      estimateType: "BE",
      totalOutlay: 3591,
      fbrTaxRevenue: 2475,
      nonTaxRevenue: 822,
      provincialTransfer: 1502,
      grantsAndTransfersOther: 337,
      federalPsdp: 540,
      defence: 627,
      debtServicing: 1154,
      pension: 171,
      subsidies: 240,
      federalEducation: 59.277,
      federalHealth: 9.863,
      fiscalDeficitRs: 1651,
      fiscalDeficitPctGdp: 6.3,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_in_Brief_2013_14.pdf",
        ["Budget at a Glance", "Function-Wise Expenditure (Summary)", "Working of Fiscal Deficit and Financing"],
      ),
    },
    {
      fiscalYear: "2014-15",
      estimateType: "BE",
      totalOutlay: 3936,
      fbrTaxRevenue: 2810,
      nonTaxRevenue: 816,
      provincialTransfer: 1720,
      grantsAndTransfersOther: 371,
      federalPsdp: 525,
      defence: 700,
      debtServicing: 1325,
      pension: 215,
      subsidies: 203,
      federalEducation: 64.014,
      federalHealth: 10.017,
      fiscalDeficitRs: 1422,
      fiscalDeficitPctGdp: 4.9,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_in_Brief_2014_15.pdf",
        ["Budget at a Glance", "Function-Wise Expenditure (Summary)", "Working of Fiscal Deficit and Financing"],
      ),
    },
    {
      fiscalYear: "2015-16",
      estimateType: "BE",
      totalOutlay: 4089,
      fbrTaxRevenue: 3104,
      nonTaxRevenue: 895,
      provincialTransfer: 1849,
      grantsAndTransfersOther: 410,
      federalPsdp: 700,
      defence: 781,
      debtServicing: 1280,
      pension: 231,
      subsidies: 138,
      federalEducation: 75.580,
      federalHealth: 11.010,
      fiscalDeficitRs: 1328,
      fiscalDeficitPctGdp: 4.3,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_in_Brief_2015_16.pdf",
        ["Budget at a Glance", "Function-Wise Expenditure (Summary)", "Working of Fiscal Deficit and Financing"],
      ),
    },
    {
      fiscalYear: "2016-17",
      estimateType: "BE",
      totalOutlay: 4394.7,
      fbrTaxRevenue: 3621.0,
      nonTaxRevenue: 959.5,
      provincialTransfer: 2135.9,
      grantsAndTransfersOther: 441.6,
      federalPsdp: 800.0,
      defence: 860.2,
      debtServicing: 1360.0,
      pension: 245.0,
      subsidies: 140.6,
      federalEducation: 84.195,
      federalHealth: 12.108,
      fiscalDeficitRs: 1276.0,
      fiscalDeficitPctGdp: 3.8,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_in_Brief_2016_17.pdf",
        ["Budget at a Glance", "Function-Wise Expenditure (Summary)", "Working of Fiscal Deficit and Financing"],
      ),
    },
    {
      fiscalYear: "2017-18",
      estimateType: "BE",
      totalOutlay: 4752.9,
      fbrTaxRevenue: 4013.0,
      nonTaxRevenue: 979.9,
      provincialTransfer: 2384.2,
      grantsAndTransfersOther: 430.2,
      federalPsdp: 1001.0,
      defence: 920.2,
      debtServicing: 1363.0,
      pension: 248.0,
      subsidies: 138.8,
      federalEducation: 90.516,
      federalHealth: 12.847,
      fiscalDeficitRs: 1479.6,
      fiscalDeficitPctGdp: 4.1,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget%20in%20Brief%202017-18.pdf",
        ["Budget at a Glance", "Function-Wise Expenditure (Summary)", "Working of Fiscal Deficit and Financing"],
      ),
    },
    {
      fiscalYear: "2018-19",
      estimateType: "BE",
      totalOutlay: 5246.2,
      fbrTaxRevenue: 4435.0,
      nonTaxRevenue: 771.9,
      provincialTransfer: 2590.1,
      grantsAndTransfersOther: 477.9,
      federalPsdp: 800.0,
      defence: 1100.3,
      debtServicing: 1620.2,
      pension: 342.0,
      subsidies: 174.7,
      federalEducation: 97.420,
      federalHealth: 13.897,
      fiscalDeficitRs: 1890.2,
      fiscalDeficitPctGdp: 4.9,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_in_Brief_2018_19.pdf",
        ["Budget at a Glance", "Function-Wise Expenditure (Summary)", "Working of Fiscal Deficit and Financing"],
      ),
    },
    {
      fiscalYear: "2019-20",
      estimateType: "BE",
      totalOutlay: 7022,
      fbrTaxRevenue: 5555,
      nonTaxRevenue: 894,
      provincialTransfer: 3255,
      grantsAndTransfersOther: 831,
      federalPsdp: 701,
      defence: 1153,
      debtServicing: 2891,
      pension: 421,
      subsidies: 272,
      federalEducation: 77.262,
      federalHealth: 11.058,
      fiscalDeficitRs: 3137,
      fiscalDeficitPctGdp: 7.1,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_in_Brief_2019_20.pdf",
        ["Budget at a Glance", "Function-Wise Expenditure (Summary)", "Working of Fiscal Deficit and Financing"],
      ),
    },
    {
      fiscalYear: "2020-21",
      estimateType: "BE",
      totalOutlay: 7137,
      fbrTaxRevenue: 4963,
      nonTaxRevenue: 1109,
      provincialTransfer: 2874,
      grantsAndTransfersOther: 905,
      federalPsdp: 650,
      defence: 1289,
      debtServicing: 2946,
      pension: 470,
      subsidies: 209,
      federalEducation: 83.363,
      federalHealth: 25.494,
      fiscalDeficitRs: 3195,
      fiscalDeficitPctGdp: 7.0,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_in_Brief_2020_21_English.pdf",
        ["Table 1: Budget at a Glance", "Table 2/3: Fiscal Deficit & Financing / Budget Estimates", "Function-Wise Expenditure (Summary)"],
      ),
    },
    {
      fiscalYear: "2021-22",
      estimateType: "BE",
      totalOutlay: 8487,
      fbrTaxRevenue: 5829,
      nonTaxRevenue: 2080,
      provincialTransfer: 3412,
      grantsAndTransfersOther: 1168,
      federalPsdp: 900,
      defence: 1370,
      debtServicing: 3060,
      pension: 480,
      subsidies: 682,
      federalEducation: 91.970,
      federalHealth: 28.352,
      fiscalDeficitRs: 3420,
      fiscalDeficitPctGdp: 6.3,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_2021_22/6_Budget_in_Brief_English_2021_22.pdf",
        ["Table 1: Budget at a Glance", "Table 2/3: Fiscal Deficit & Financing / Budget Estimates", "Function-Wise Expenditure (Summary)"],
      ),
    },
    {
      fiscalYear: "2022-23",
      estimateType: "BE",
      totalOutlay: 9579,
      fbrTaxRevenue: 7470,
      nonTaxRevenue: 1935,
      provincialTransfer: 4373,
      grantsAndTransfersOther: 1174,
      federalPsdp: 727,
      defence: 1563,
      debtServicing: 3950,
      pension: 609,
      subsidies: 664,
      federalEducation: 90.556,
      federalHealth: 19.582,
      fiscalDeficitRs: 3797,
      fiscalDeficitPctGdp: 4.9,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_2022_23/Budget_in_Brief_English.pdf",
        ["Table 1: Budget at a Glance", "Table 2/3: Fiscal Deficit & Financing / BE & RE Comparison", "Function-Wise Expenditure (Summary)"],
      ),
    },
    {
      fiscalYear: "2023-24",
      estimateType: "BE",
      totalOutlay: 14484,
      fbrTaxRevenue: 9415,
      nonTaxRevenue: 2963,
      provincialTransfer: 5399,
      grantsAndTransfersOther: 1408,
      federalPsdp: 950,
      defence: 1804,
      debtServicing: 7303,
      pension: 801,
      subsidies: 1064,
      federalEducation: 97.098,
      federalHealth: 24.210,
      fiscalDeficitRs: 6905,
      fiscalDeficitPctGdp: 6.53,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_2023_24/Budget_in_Brief.pdf",
        ["Table 1: Budget at a Glance", "Table 2/3: Fiscal Deficit & Financing / BE & RE Comparison", "Function-Wise Expenditure (Summary)"],
      ),
    },
    {
      fiscalYear: "2024-25",
      estimateType: "BE",
      totalOutlay: 18877,
      fbrTaxRevenue: 12970,
      nonTaxRevenue: 4845,
      provincialTransfer: 7438,
      grantsAndTransfersOther: 1777,
      federalPsdp: 1400,
      defence: 2122,
      debtServicing: 9775,
      pension: 1014,
      subsidies: 1363,
      federalEducation: 103.781,
      federalHealth: 28.171,
      fiscalDeficitRs: 7283,
      fiscalDeficitPctGdp: 5.9,
      citations: bib(
        "https://www.finance.gov.pk/budget/Budget_2024_25/Budget_in_Brief.pdf",
        ["Table 1: Budget at a Glance", "Table 2/3: Fiscal Deficit & Financing / BE & RE Comparison", "(7) Health Affairs and Services / (9) Education Affairs and Services"],
      ),
    },
    {
      fiscalYear: "2025-26",
      estimateType: "BE",
      totalOutlay: 17573,
      fbrTaxRevenue: 14131,
      nonTaxRevenue: 5147,
      provincialTransfer: 8206,
      grantsAndTransfersOther: 1928,
      federalPsdp: 1000,
      defence: 2550,
      debtServicing: 8207,
      pension: 1055,
      subsidies: 1186,
      federalEducation: 112.683,
      federalHealth: 31.975,
      fiscalDeficitRs: 5037,
      fiscalDeficitPctGdp: 3.9,
      citations: bib(
        "https://www.finance.gov.pk/budget/budget_2025_26/budget_in_brief_10062025.pdf",
        ["Table 1: Budget at a Glance", "Table 2/3: Fiscal Deficit & Financing / BE & RE Comparison", "Table 11: Function-Wise Expenditure"],
      ),
    },
    {
      fiscalYear: "2026-27",
      estimateType: "BE",
      totalOutlay: 18771,
      fbrTaxRevenue: 15264,
      nonTaxRevenue: 5336,
      provincialTransfer: 8848,
      grantsAndTransfersOther: 2680,
      federalPsdp: 1000,
      defence: 3000,
      debtServicing: 8054,
      pension: 1169,
      subsidies: 1091,
      federalEducation: 117.748,
      federalHealth: 37.438,
      fiscalDeficitRs: 5226,
      fiscalDeficitPctGdp: 3.6,
      citations: bib(
        "https://www.finance.gov.pk/budget/budget_2026_27/Budget_in_Brief.pdf",
        ["Table 1: Budget at a Glance", "Table 2/3: Fiscal Deficit & Financing / BE & RE Comparison", "Table 11: Function-Wise Expenditure"],
      ),
    },
  ],
};

export function getLatestBudgetYear(): BudgetYearRecord {
  return BUDGET_HISTORICAL.years[BUDGET_HISTORICAL.years.length - 1];
}

export function getBudgetYear(fiscalYear: string): BudgetYearRecord | undefined {
  return BUDGET_HISTORICAL.years.find((y) => y.fiscalYear === fiscalYear);
}
