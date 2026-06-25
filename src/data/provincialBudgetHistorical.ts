// Pakistan's four provincial budgets — Punjab, Sindh, Khyber Pakhtunkhwa,
// and Balochistan — transcribed by hand from each province's own official
// budget documents, the same no-API-key, verified-source approach as
// budgetHistorical.ts (the Federal Budget Workshop). This is a SEPARATE
// workshop and a SEPARATE dataset — provincial and federal budgets are
// different documents from different governments and are never merged.
//
// COVERAGE: unlike the federal dataset (one consistent FY2010-11 start for
// all fields), a verified source audit found each province's real,
// fetchable archive starts in a different year:
//   Punjab        FY2010-11 onward (verified via direct PDF fetch)
//   Sindh         FY2011-12 onward for top-line aggregates; full multi-volume
//                 "Budget Books" (where sector detail lives) only confirmed
//                 from FY2018-19
//   KP            FY2015-16 onward (FY2014-15 and earlier 404 on the
//                 official site; an older "Financial Statements 2010-11"
//                 exists but is a different document type — actuals, not
//                 budget estimates)
//   Balochistan   FY2017-18 onward, and only reconstructable via the Wayback
//                 Machine — the live site has nothing before FY2025-26
// Rather than force a uniform start year padded with nulls, each province's
// `years` array simply starts where its real, citable archive does. Only
// the most recent verified year has been transcribed so far (see below) —
// earlier years are a tracked follow-up, not fabricated placeholders.
//
// CATEGORY-BASIS CAVEAT: each province's own budget documents define
// "Education", "Health", "Agriculture", "Local Government", and
// "Infrastructure" differently — some show current (recurring) expenditure
// only, some show development (ADP/PSDP) allocations only, and at least one
// (Sindh) bundles Agriculture together with Irrigation/Livestock/Fisheries
// rather than isolating it. Every record's `notes` field documents exactly
// which basis was used and why — see each entry below rather than assuming
// these five fields are computed on a consistent basis across provinces.

export type ProvinceId = "punjab" | "sindh" | "kp" | "balochistan";

export interface ProvincialBudgetCitation {
  document: "White Paper" | "Annual Budget Statement" | "Budget at a Glance" | "Budget Highlights" | "ADP" | "PSDP";
  url: string;
  tables: string[];
}

/**
 * An additional, officially-documented expenditure category that doesn't
 * fit the fixed fields below — used to break down the "Other" residual in
 * the allocation chart further without forcing every province onto the
 * same fixed category list. Provinces report wildly different sectors as
 * distinct line items (e.g. Sindh separates "Law & Order" and "Provincial
 * Contribution for National Strategic Requirement"; Balochistan separates
 * "Irrigation" and "Science & IT"; Punjab separates "Public Safety &
 * Police"), so a flexible array is the only design that doesn't either
 * force null fields on three provinces or invent a category no document
 * actually uses. Added only where a real source figure was found — never
 * a synthetic split of the residual.
 */
export interface OtherBreakdownItem {
  label: string;
  value: number;
  /** Basis/source caveat shown in the allocation table and chart tooltip — e.g. "CRE basis — distinct from the Local Government PSDP figure above." */
  note?: string;
}

export interface ProvincialBudgetYearRecord {
  fiscalYear: string;
  estimateType: "BE";

  totalOutlay: number | null;
  developmentBudget: number | null;
  currentExpenditure: number | null;
  education: number | null;
  health: number | null;
  agriculture: number | null;
  localGovernment: number | null;
  infrastructure: number | null;
  debtServicing: number | null;
  pension: number | null;
  ownRevenue: number | null;
  federalTransfers: number | null;
  /** Signed — negative means deficit, positive means surplus. */
  fiscalBalance: number | null;
  /** See OtherBreakdownItem — populated only for years where the audit (Provincial Budget "Other" breakdown pass) found additional verified categories beyond the fixed fields above. */
  otherBreakdown?: OtherBreakdownItem[];
  /** The source document's OWN description of what remains lumped together after every named/otherBreakdown category is removed (e.g. Sindh's White Paper literally lists "Energy, Culture, Sports & Youth Affairs, Board of Revenue, Works & Services, Women Development etc"). Shown in the UI's "Other" info panel verbatim when present, in place of the generic fallback explanation. */
  otherResidualNote?: string;

  citations: {
    summary: ProvincialBudgetCitation;
    sectoral?: ProvincialBudgetCitation;
    development?: ProvincialBudgetCitation;
  };
  notes?: string;
}

export interface ProvincialBudgetDataset {
  province: ProvinceId;
  name: string;
  currency: "PKR";
  unit: "billion";
  years: ProvincialBudgetYearRecord[];
}

function bib(
  document: ProvincialBudgetCitation["document"],
  url: string,
  tables: string[],
): { summary: ProvincialBudgetCitation } {
  return { summary: { document, url, tables } };
}

export const PROVINCIAL_BUDGET_HISTORICAL: Record<ProvinceId, ProvincialBudgetDataset> = {
  punjab: {
    province: "punjab",
    name: "Punjab",
    currency: "PKR",
    unit: "billion",
    years: [
      {
        fiscalYear: "2010-11",
        estimateType: "BE",
        totalOutlay: 628.997,
        developmentBudget: 193.5,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: 27.9,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/White_Paper_2010-11.pdf",
            ["Chapter 1 — Introduction to the Budget 2010-11", "Pension expenditure paragraph"],
          ),
        },
        notes:
          "Total Budget Outlay (628.997bn) is the Provincial Consolidated Fund (PCF) figure, not from this year's own White Paper (which did not state a clean PCF total in prose) but from the FY2011-12 White Paper's own comparison sentence: 'of the Provincial Consolidated Fund (PCF) has been pitched at Rs.709,624.339 million for the next financial year compared to BE 2010-11 of Rs.628,997.329 million.' Development Budget (193.5bn) and Pension (27.9bn) are both directly stated in this year's own White Paper ('Development Budget of the province has been pitched at Rs.193,500.000 million for FY 2010-11'; 'expenditure on Pension is pitched at Rs.27,900.000 million in FY 2010-11'). Other fields not locatable as clean figures in this document and left null.",
      },
      {
        fiscalYear: "2011-12",
        estimateType: "BE",
        totalOutlay: 709.624,
        developmentBudget: 220.0,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: 40.535,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/White%20Paper%202011-12.pdf",
            ["Chapter 1 — Provincial Consolidated Fund", "Development Budget paragraph", "Pension expenditure paragraph"],
          ),
        },
        notes:
          "Total Budget Outlay (709.624bn): 'of the Provincial Consolidated Fund (PCF) has been pitched at Rs.709,624.339 million for the next financial year' — also cross-confirms FY2010-11's 628.997bn figure used in that year's record. Development Budget (220.0bn): 'Development Budget of the province has been pitched at Rs. 220,000.000 million for FY 2011-12.' Pension (40.535bn): 'The expenditure on Pension is pitched at Rs. 40,535.247 million in FY 2011-12 against a provision of Rs. 27,990.494 million in FY 2010-11' (the FY2010-11 reference here, 27.990bn, also matches that year's own record within rounding). Other fields left null.",
      },
      {
        fiscalYear: "2012-13",
        estimateType: "BE",
        totalOutlay: 807.721,
        developmentBudget: 250.0,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: 55.736,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/WP2012_13.pdf",
            ["Development Budget paragraph", "Pension expenditure paragraph"],
          ),
        },
        notes:
          "Total Budget Outlay (807.721bn) is not from this year's own White Paper directly, but from the FY2013-14 White Paper's comparison sentence: 'the Provincial Consolidated Fund that has been pitched at Rs. 919,314.576 million for next FY 2013-2014 as compared to Rs. 807,720.939 million for BE 2012-2013.' (This year's own document instead gave a narrower 'General Revenue Receipts' figure of 780.675bn, which excludes capital/development inflows and was not used, to keep the Total Outlay series on a consistent PCF basis across years.) Development Budget (250.0bn) and Pension (55.736bn) are directly stated in this year's own White Paper. Other fields left null.",
      },
      {
        fiscalYear: "2013-14",
        estimateType: "BE",
        totalOutlay: 919.315,
        developmentBudget: 290.0,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: 74.935,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/WhitePaper2013_14.pdf",
            ["Chapter 1 — Estimates of Receipts", "Development Budget paragraph", "Pension expenditure paragraph"],
          ),
        },
        notes:
          "Total Budget Outlay (919.315bn): 'the total receipts less Food Account Receipts constitute the Provincial Consolidated Fund that has been pitched at Rs. 919,314.576 million for next FY 2013-2014.' This document distinguishes PCF from the broader 'total receipts' figure (1,180.214bn, which includes Food Account Receipts) — PCF was used for consistency with other years' basis. Development Budget (290.0bn) and Pension (74.935bn) directly stated. Other fields left null.",
      },
      {
        fiscalYear: "2014-15",
        estimateType: "BE",
        totalOutlay: 1095.124,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: 104.0,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/WP2014_15.pdf",
            ["Chapter 1 — Estimates of Receipts", "Pension expenditure paragraph"],
          ),
        },
        notes:
          "Total Budget Outlay (1,095.124bn): 'The total receipts less Food Account Receipts has been pitched at Rs. 1,095,123.832 [million]' — same PCF concept as FY2013-14. Pension (104.0bn): 'Expenditure on Pension is pitched at Rs.104,000.000 million in FY2014-15 against the revised estimate of Rs. 77,644.000 million.' A separate multi-column 'Budget at a Glance'-style infographic in this same document appeared to show a different total (1,349.4bn) but could not be reconciled to a clear row/column label with confidence, so the narrative-stated PCF figure was used instead and the infographic figure discarded. Development Budget not locatable as a clean figure this year; left null.",
      },
      {
        fiscalYear: "2015-16",
        estimateType: "BE",
        totalOutlay: null,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          summary: { document: "White Paper", url: "https://finance.punjab.gov.pk/details/white-paper", tables: [] },
        },
        notes:
          "No FY2015-16 document could be located: this fiscal year is absent from the Finance Department's own White Paper archive listing (https://finance.punjab.gov.pk/details/white-paper jumps from 2014-15 to 2016-17), and a directly-guessed filename (WP201516.pdf) returned 404. All fields left null rather than estimated. The citation URL points to the archive index page itself, not a specific document, since none was found — flagged here as a genuine gap for future re-verification rather than silently omitted from the time series.",
      },
      {
        fiscalYear: "2016-17",
        estimateType: "BE",
        totalOutlay: 1681.417,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: 128.0,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/wp_1617.pdf",
            ["Consolidated Fund paragraph", "Pension expenditure paragraph"],
          ),
        },
        notes:
          "Total Budget Outlay (1,681.417bn): 'Consolidated Fund has been pitched at Rs. 1,681.417 billion for the Financial Year 2016-17' — directly stated, and independently cross-confirmed by the FY2017-18 White Paper's own historical-comparison table, which restates this same figure (1,681,416.623 thousand) as its prior-year reference. Pension (128.0bn): 'expenditure on Pension is pitched at Rs. 128,000.000 million in FY 2016-17.' Other fields left null.",
      },
      {
        fiscalYear: "2017-18",
        estimateType: "BE",
        totalOutlay: 1970.7,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: 173.809,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/WhitePaper17-18.pdf",
            ["Total Provincial Consolidated Fund table (Page in Chapter 1)", "Pension expenditure paragraph"],
          ),
        },
        notes:
          "Total Budget Outlay (1,970.7bn): this year's own document did not state a clean prose 'pitched at' sentence, but its own 'Total Provincial Consolidated Fund' table shows 1,970,700.000 (thousand) as its own-year value, and that exact figure is independently cross-confirmed as the prior-year reference in the FY2018-19 White Paper's equivalent table — agreement across two separately-published documents gives reasonable confidence despite the lack of a single narrative sentence. Pension (173.809bn) directly stated in prose. Other fields left null.",
      },
      {
        fiscalYear: "2018-19",
        estimateType: "BE",
        totalOutlay: 1878.716,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/WhitePaper18-192.pdf",
            ["Total Provincial Consolidated Fund table — single-document figure, not independently cross-confirmed"],
          ),
        },
        notes:
          "Total Budget Outlay (1,878.716bn) appears in this document's own 'Total Provincial Consolidated Fund' table — used, but flagged as LOWER CONFIDENCE than FY2016-17/FY2017-18's equivalent figures: unlike those years, this one could not be independently cross-confirmed against an adjacent year's document (the FY2019-20 White Paper is a much larger file that could not be retrieved within this session's time budget; see FY2019-20's own record), and it represents a YoY decrease versus FY2017-18 (1,970.7bn) that is plausible (a revised-down BE is normal) but unconfirmed. No narrative 'pitched at' sentence or Pension figure was found in a quick search of this document; those fields left null.",
      },
      {
        fiscalYear: "2019-20",
        estimateType: "BE",
        totalOutlay: null,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          summary: { document: "White Paper", url: "https://finance.punjab.gov.pk/system/files/wpab2019-20.pdf", tables: [] },
        },
        notes:
          "The FY2019-20 White Paper is confirmed to exist at this URL (HTTP 200) but is an unusually large file (~40MB) that could not be fully downloaded within this session's practical time budget — repeated attempts were still in progress when this backfill pass concluded. Flagged as a genuine, named follow-up rather than estimated or skipped from the time series.",
      },
      {
        fiscalYear: "2020-21",
        estimateType: "BE",
        totalOutlay: 2240.7,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/WPBudget-2020-21.pdf",
            ["Estimates of Receipts — Total Provincial Consolidated Fund (a+b+c+d)", "Budget at a Glance (Page XI)"],
          ),
        },
        notes:
          "Total Budget Outlay (2,240.7bn) is the 'Total Provincial Consolidated Fund (a+b+c+d)' figure from the Estimates of Receipts table, cross-checked against the same value appearing independently in the 'Budget at a Glance' infographic ('Total Receipts A/C-I ... 2,240.7'). All other fields (Current/Development Expenditure split, sector allocations, Pension, Debt Servicing, Own Revenue, Federal Transfers, Fiscal Balance) appear in this White Paper only inside multi-column infographic tables whose row/column alignment could not be reliably reconstructed from PDF text extraction (no PDF visual-rendering tool was available to confirm by sight) — left null rather than risk misattributing a number to the wrong line item.",
      },
      {
        fiscalYear: "2021-22",
        estimateType: "BE",
        totalOutlay: 2653.0,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/WP202122.pdf",
            ["Budget at a Glance infographic and Total Provincial Consolidated Fund (a+b+c+d) table — two conflicting candidate figures found"],
          ),
        },
        notes:
          "Total Budget Outlay (2,653.0bn) was chosen from two conflicting candidates found in this document: this figure carries an explicit 'Total Provincial Consolidated Fund (a+b+c+d)' summation label, matching the same labeling convention independently verified as reliable for FY2020-21/FY2022-23/FY2023-24; a second, unlabeled infographic figure (2,107.7bn) elsewhere in the same document was not used. Flagged as LOWER CONFIDENCE than years with narrative or cross-document confirmation, since no second source corroborates either number. A separate retrospective Pension table (covering FY10-11 through FY12-13 only) used different basis/values than this province's own contemporaneous Budget Estimates for those years (e.g. its FY10-11 figure of 36.40bn vs. the 27.9bn BE figure used in that year's own record) — interpreted as an actuals/different-vintage series, not used here or for this year. All other fields left null.",
      },
      {
        fiscalYear: "2022-23",
        estimateType: "BE",
        totalOutlay: 3226.4,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/WhitePaper22-23.pdf",
            ["Estimates of Receipts — Total Provincial Consolidated Fund (a+b+c+d), Rs. 3,226.391bn", "Budget 2022-23 at a Glance (Page X-XI)"],
          ),
        },
        notes:
          "Total Budget Outlay (3,226.4bn) confirmed via two independent appearances of the same 'Total Provincial Consolidated Fund (a+b+c+d)' figure in this White Paper, and independently re-confirmed the following year via the FY2023-24 Annual Budget Statement's own historical comparison table, which restates FY2022-23 BE as 3,226,391.258 (Rs. million) — an exact match. All sectoral/component fields left null for the same PDF-table-extraction-reliability reason as FY2020-21.",
      },
      {
        fiscalYear: "2023-24",
        estimateType: "BE",
        totalOutlay: 4480.7,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "Annual Budget Statement",
            "https://finance.punjab.gov.pk/system/files/Annual%20Budget%20Statement%202023-2024.pdf",
            ["Punjab Fiscal Framework 2023-24 (Page 2)", "Estimates of Receipts — Total Provincial Consolidated Fund (Revenue + Capital) (Page 4)"],
          ),
        },
        notes:
          "No standalone White Paper was located for FY2023-24 (absent from the Finance Department's White Paper archive page); the Annual Budget Statement was used instead. Total Budget Outlay (4,480.7bn) is the 'Budget Estimate 2023-24' column of '(A) Total Provincial Consolidated Fund (Revenue + Capital)'. The same table's other 3 columns are Accounts 2021-22 (2,482.4bn, actual), Budget Estimate 2022-23 (3,226.4bn — matches the figure independently confirmed from the FY2022-23 White Paper itself) and Revised Estimate 2022-23 (3,667.6bn) — included here only as a cross-check, not stored as separate year records since they are not this document's primary BE figure for those years. Sectoral/component fields for FY2023-24 left null: the document's expenditure-side tables (Punjab Fiscal Framework, Estimates of Current/Development Expenditure) use the same 4-column layout but several rows' Revised-Estimate/Budget-Estimate values did not extract cleanly as text, so were not used rather than risk a misattributed figure.",
      },
      {
        fiscalYear: "2024-25",
        estimateType: "BE",
        totalOutlay: 3410.0,
        developmentBudget: 875.0,
        currentExpenditure: 2535.0,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/WP25-26N.pdf",
            ["Chapter II — Budget Strategy: Medium-Term Fiscal Framework (Base Year column)", "Executive Summary"],
          ),
        },
        notes:
          "Sourced from the FY2025-26 White Paper's own Medium-Term Fiscal Framework table, which restates FY2024-25 as its 'Base Year' column (A-General Revenue Receipts 4,278 / B-Current Expenditure 2,535 / F-Development Expenditure 875), and from the Executive Summary's explicit prose statement: 'The Punjab Government estimates total expenditure for FY2024-25 at Rs. 3,410 billion.' These two sources reconcile exactly (2,535 + 875 = 3,410), giving confidence both figures share the same accounting basis for this year. Education and Health were each found only as a single ADP/development-only allocation (Rs. 82bn and Rs. 165bn respectively, per the same White Paper's sector-comparison sentence for FY2025-26) — left null rather than reported alone, since that would understate each sector by omitting current/recurring spending, the same judgment already applied to KP's FY2026-27 record. Agriculture, Infrastructure, Debt Servicing, Pension, Own Revenue, Federal Transfers, and Fiscal Balance were not locatable as clean, unambiguous figures in the documents checked (White Paper, Annual Budget Statement 2024-2025 — its granular object-classification tables could not be reconciled to a confident top-line total; Budget Speech 2025-26 — Urdu-script PDF, not machine-readable with available tools) and are left null rather than estimated.",
      },
      {
        fiscalYear: "2025-26",
        estimateType: "BE",
        totalOutlay: 5335.0,
        developmentBudget: 1240.0,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://finance.punjab.gov.pk/system/files/WP25-26N.pdf",
            ["Budget 2025-26 at a Glance (Page XIII)", "Executive Summary (Page XI)"],
          ),
        },
        notes:
          "Total Budget Outlay (5,335.0bn) is the 'Total Expenditure' figure in the 'Budget 2025-26 at a Glance' infographic, independently cross-checked against the FY2026-27 budget's own reported 10.7% YoY increase (5,903.46 / 1.107 ≈ 5,334.6bn — matches). Development Expenditure (1,240.0bn) is the ADP envelope, explicitly stated in prose: 'Development Expenditure for FY 2025-26 has been set at Rs. 1,240 billion under the Annual Development Program (ADP), an unprecedented 47.3% increase over last year.' Current Expenditure is null: the same White Paper's Medium-Term Fiscal Framework table gives a Current Expenditure of 2,958bn for this year, but that figure plus its own Development figure (1,200bn, itself inconsistent with the 1,240bn ADP figure above) sums to 4,158bn — neither reconciles with the 5,335.0bn headline Total Outlay, indicating the MTFF table uses a materially narrower expenditure scope than the headline figure. Reporting either narrower number as 'Current Expenditure' against the broader Total Outlay would mismatch bases, so it is left null. Education/Health/Agriculture were found only as ADP-only sectoral allocations (148bn/182bn/80bn) — same understatement risk as FY2024-25, left null. Pension showed two irreconcilable candidate figures (a historical pension-trend table on Page 38 that could not be reliably mapped to specific fiscal years after PDF table-layout extraction, and a possible 462.2bn in the Budget-at-a-Glance infographic whose row/label alignment could not be confirmed) — left null rather than guess between them. Infrastructure, Debt Servicing, Own Revenue, Federal Transfers, and Fiscal Balance were not locatable as clean top-line figures in the documents checked.",
      },
      {
        fiscalYear: "2026-27",
        estimateType: "BE",
        totalOutlay: 5903.5,
        developmentBudget: 752.0,
        currentExpenditure: 1962.9,
        education: 750.1,
        health: 500.6,
        agriculture: 91.9,
        localGovernment: 823.9,
        infrastructure: 272.8,
        debtServicing: 70.06,
        pension: null, // TODO verify — placeholder pending Punjab backfill pass
        ownRevenue: 1209.9,
        federalTransfers: 4390.9,
        fiscalBalance: 910.0,
        otherBreakdown: [
          { label: "Public Safety & Police", value: 252.1, note: "Budget Highlights' own 'Sectoral Allocations in FY 2026-27' infographic — a headline sector distinct from Education/Health/Infrastructure/Agriculture already listed above." },
        ],
        citations: {
          ...bib(
            "Budget Highlights",
            "https://finance.punjab.gov.pk/system/updata/files/37_20260616092322.pdf",
            ["Budget 2026-27 At a Glance", "Sectoral Allocations in FY 2026-27", "Punjab Own Source Revenue"],
          ),
          development: {
            document: "ADP",
            url: "https://finance.punjab.gov.pk/system/updata/files/24_20260616091430.pdf",
            tables: ["ADP Resources", "ESTIMATES OF EXPENDITURE 2026-2027"],
          },
        },
        notes:
          "Current Expenditure (1,962.9bn) is the document's own narrower 'Current Expenditure' headline figure, distinct from the broader 'Total Current Revenue Expenditure incl. Service Delivery' figure (3,292.5bn) shown elsewhere in the same Annual Budget Statement — the narrower figure was chosen to match the Budget Highlights' own top-line framing. Local Government (823.9bn) is the PFC Transfers to Local Governments/Authorities figure, not the Local Government department's own internal sector budget (409.8bn) — chosen because 'allocation' here is most naturally read as money flowing to local government, not the provincial LG department's own running costs. Debt Servicing combines foreign (42.22bn) and domestic (27.84bn) debt management object-classification lines, cross-verified against the separate Punjab Smart Book FY2026-27.",
      },
    ],
  },
  sindh: {
    province: "sindh",
    name: "Sindh",
    currency: "PKR",
    unit: "billion",
    years: [
      {
        fiscalYear: "2011-12",
        estimateType: "BE",
        totalOutlay: 457.547,
        developmentBudget: 141.09,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: 0.882,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2012-13.pdf",
            ["Total Expenditures of the Province [G+H+I] J (FY2011-12 BE column)"],
          ),
        },
        notes:
          "No FY2011-12 'Budget at a Glance' document is directly downloadable (the URL pattern that works for FY2012-13 onward 404s for this year), so all figures are taken from the FY2012-13 Budget at a Glance's own prior-year comparison column instead. Total Budget Outlay (457.547bn), Development/ADP (141.09bn), and Fiscal Balance (+0.882bn, a surplus) all come from this single cross-year table. Sector and revenue-composition fields left null: no sectoral 'White Paper' is confirmed available this far back (see the dataset header's per-province source audit).",
      },
      {
        fiscalYear: "2012-13",
        estimateType: "BE",
        totalOutlay: 577.984,
        developmentBudget: 231.174,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -7.166,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2012-13.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "Total Budget Outlay (577.984bn), Development (231.174bn), and Fiscal Balance (-7.166bn) are this document's own BE2012-13 column — independently cross-confirmed as the prior-year reference figure in both the FY2013-14 and FY2014-15 Budget at a Glance documents. Other fields left null.",
      },
      {
        fiscalYear: "2013-14",
        estimateType: "BE",
        totalOutlay: 617.213,
        developmentBudget: 229.937,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -21.638,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2014-15.pdf",
            ["Total Expenditures of the Province [G+H+I] J (FY2013-14 BE column)"],
          ),
        },
        notes:
          "Development Budget (229.937bn) independently cross-confirmed: appears identically in this year's own Budget at a Glance ('Provincial ADP (excluding FPA and FERP)' BE column) and as the prior-year reference in the FY2014-15 document. Total Outlay (617.213bn) and Fiscal Balance (-21.638bn) taken from the FY2014-15 document's cleaner 3-column table rather than this year's own (which had a column-alignment issue for the total row specifically). Other fields left null.",
      },
      {
        fiscalYear: "2014-15",
        estimateType: "BE",
        totalOutlay: 686.179,
        developmentBudget: 215.359,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -14.061,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2014-15.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "Total Outlay (686.179bn), Development (215.359bn), and Fiscal Balance (-14.061bn) are this document's own BE2014-15 column, independently cross-confirmed as the prior-year reference in the FY2015-16 Budget at a Glance. Other fields left null.",
      },
      {
        fiscalYear: "2015-16",
        estimateType: "BE",
        totalOutlay: 739.302,
        developmentBudget: 213.649,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -12.728,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2015-16.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "Total Outlay (739.302bn), Development (213.649bn), and Fiscal Balance (-12.728bn) are this document's own BE2015-16 column, independently cross-confirmed as the prior-year reference in the FY2016-17 Budget at a Glance. Other fields left null.",
      },
      {
        fiscalYear: "2016-17",
        estimateType: "BE",
        totalOutlay: 869.118,
        developmentBudget: 265.988,
        currentExpenditure: 572.76,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -14.617,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2016-17.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Current Revenue Expenditure Total G", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "Total Outlay (869.118bn), Development (265.988bn), and Fiscal Balance (-14.617bn) are this document's own BE2016-17 column, cross-confirmed as the prior-year reference in the FY2017-18 document. Current Revenue Expenditure (572.76bn) is this document's own 'Total G' BE2016-17 column, cross-confirmed against the FY2017-18 document's prior-year reference. Other fields left null.",
      },
      {
        fiscalYear: "2017-18",
        estimateType: "BE",
        totalOutlay: 1043.186,
        developmentBudget: 344.068,
        currentExpenditure: 666.474,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -14.32,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2017-18.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Current Revenue Expenditure Total G", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "Total Outlay (1,043.186bn) independently confirmed FOUR separate times — own document, FY2018-19's prior-year reference, FY2019-20's prior-year reference, and FY2018-19's own narrative 'total expenditures of the Province'. Current Revenue Expenditure (666.474bn) and Development (344.068bn) both cross-confirmed across two documents. This is the dataset's most rigorously cross-validated Sindh year before FY2018-19's full Budget Books era began. Other fields left null — no full Budget Books/White Paper exists this far back per the existing per-province source audit.",
      },
      {
        fiscalYear: "2018-19",
        estimateType: "BE",
        totalOutlay: 1144.449,
        developmentBudget: 343.911,
        currentExpenditure: 773.237,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -20.458,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2018-19.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Current Revenue Expenditure Total G", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "All figures cross-confirmed via the FY2019-20 and FY2020-21 documents' prior-year reference columns. This is the first year the existing per-province audit flags as having full multi-volume Budget Books (sectoral detail) — however, a quick search of this year's documents did not turn up a clean, unambiguous Education/Health/Agriculture/Pension/Debt-Servicing/Own-Revenue/Federal-Transfers figure (the Receipts-side breakdown in 'Budget at a Glance' suffers the same multi-column PDF-extraction misalignment seen throughout this exercise), so those remain null rather than risk misattribution.",
      },
      {
        fiscalYear: "2019-20",
        estimateType: "BE",
        totalOutlay: 1217.898,
        developmentBudget: 284.038,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -16.002,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2019-20.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "This year's own Budget at a Glance had a more severe column-merging artifact than other years (OCR-style text fragments from page footers bled into the data table); Total Outlay and Development were instead taken from the FY2020-21 document's prior-year reference column, where the same two figures (1,217,897.9 and 284,037.5, in Rs million) appear as fragments in this year's own document too — giving cross-document confidence despite the own-document table being unusable directly. Current Revenue Expenditure could not be confirmed and is left null, along with all other fields.",
      },
      {
        fiscalYear: "2020-21",
        estimateType: "BE",
        totalOutlay: 1241.126,
        developmentBudget: 232.943,
        currentExpenditure: 968.991,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -18.38,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2020-21.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Current Revenue Expenditure Total G", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "All figures cross-confirmed via the FY2021-22 document's prior-year reference column. Other fields left null.",
      },
      {
        fiscalYear: "2021-22",
        estimateType: "BE",
        totalOutlay: 1477.904,
        developmentBudget: 329.033,
        currentExpenditure: 1089.372,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -25.735,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2021-22.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Current Revenue Expenditure Total G", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "All figures cross-confirmed via the FY2022-23 document's prior-year reference column. Other fields left null.",
      },
      {
        fiscalYear: "2022-23",
        estimateType: "BE",
        totalOutlay: 1713.584,
        developmentBudget: 459.658,
        currentExpenditure: 1199.445,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -33.849,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetAtAGlance%5C2022-23.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Current Revenue Expenditure Total G", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "All figures cross-confirmed via the FY2023-24 document's prior-year reference column. Other fields left null.",
      },
      {
        fiscalYear: "2023-24",
        estimateType: "BE",
        totalOutlay: 2282.581,
        developmentBudget: 735.103,
        currentExpenditure: 1411.222,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -42.796,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetBooks%5CFY-23-24%5CBUDGET%20AT%20A%20GLANCE%202023-24.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Current Revenue Expenditure Total G", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "All figures cross-confirmed via the FY2024-25 document's prior-year reference column. No standalone White Paper was located for this year (only a Budget at a Glance) — sector fields left null.",
      },
      {
        fiscalYear: "2024-25",
        estimateType: "BE",
        totalOutlay: 3056.263,
        developmentBudget: 959.065,
        currentExpenditure: 1912.359,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetBooks%5CFY-24-25%5CBudget%20at%20a%20Glance%202024-25.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Current Revenue Expenditure Total G", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "Total Outlay, Current Expenditure, and Development all cross-confirmed via the FY2025-26 document's prior-year reference column. Fiscal Balance left null: this year's own BE column for 'Surplus/Deficit (F-J)' was blank in both this document and the FY2025-26 cross-reference. A 'Budget Highlights 2024-25' document was also checked but did not add sectoral figures beyond what's already here.",
      },
      {
        fiscalYear: "2025-26",
        estimateType: "BE",
        totalOutlay: 3442.0,
        developmentBudget: 1018.327,
        currentExpenditure: 2142.0,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: -30.458,
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetBooks%5CFY-25-26%5CBUDGET%20AT%20GLANCE%202025-26.pdf",
            ["Total Expenditures of the Province [G+H+I] J", "Current Revenue Expenditure Total G", "Provincial Development Expenditure ADP I"],
          ),
        },
        notes:
          "Total Outlay, Current Expenditure, Development, and Fiscal Balance are this document's own BE2025-26 column, cross-confirmed as the prior-year reference in the FY2026-27 White Paper. A separate 'White Paper 2025-26' was also checked for Education/Health/Agriculture/Pension: a department-wise Current Revenue Expenditure table exists ('Education and Literacy', 'Health', etc.) but its row labels and values were offset by one row after PDF text extraction (the same recurring problem throughout this exercise) — not used, left null. Pension is explicitly bundled into an 'Others - (Pension, Debt servicing etc.)' line in the same document with no standalone breakout, matching the existing FY2026-27 record's own note about Debt Servicing not being separately itemized.",
      },
      {
        fiscalYear: "2026-27",
        estimateType: "BE",
        totalOutlay: 3562.06,
        developmentBudget: 720.385,
        currentExpenditure: 2560.0,
        education: 551.0,
        health: 354.271,
        agriculture: 89.084,
        localGovernment: 107.54,
        infrastructure: 42.69,
        debtServicing: null,
        pension: null,
        ownRevenue: 775.06,
        federalTransfers: 2263.19,
        fiscalBalance: -36.94,
        otherBreakdown: [
          { label: "Law & Order", value: 216.573, note: "'Sectoral Allocation in CRE' table, White Paper 2026-27 — current/recurring basis (Home Department, Police)." },
          { label: "Municipal Services (Current)", value: 201.394, note: "Same 'Sectoral Allocation in CRE' table — a current-expenditure figure, distinct from the PSDP/development-basis 'Local Government' figure already listed above; the two do not overlap." },
          { label: "Empowerment of Persons with Disabilities", value: 19.356, note: "'Sectoral Allocation in CRE' table, White Paper 2026-27." },
          { label: "Provincial Contribution — National Strategic Requirement", value: 260.0, note: "'Sectoral Allocation in CRE' table, White Paper 2026-27 — a fixed federal-level contribution, not a province department." },
        ],
        otherResidualNote:
          "Sindh's own White Paper labels its remaining CRE residual as 'Others (including Energy, Culture, Sports & Youth Affairs, Board of Revenue, Works & Services, Women Development etc)' — Rs 868.4bn of the total Other shown here. The rest of Other is Current Capital Expenditure (Rs 281.7bn, e.g. Sindh Pension Fund and Viability Gap Fund contributions) and the non-itemized share of Development Expenditure, neither of which is broken into named departments in the source document.",
        citations: {
          ...bib(
            "Budget at a Glance",
            "https://finance.gos.pk/Home/Download?path=Budget%5CBudgetBooks%5CFY-26-27%5CBUDGET%20AT%20GLANCE%202026-27.pdf",
            ["Section I — Receipts", "Section II — Expenditure"],
          ),
          sectoral: {
            document: "White Paper",
            url: "https://finance.gos.pk/Home/Download?path=Budget%2FBudgetBooks%2FFY-26-27%2FWHITE%20PAPER%202026-27.pdf",
            tables: ["Major Components of Expenditure", "Sectoral Allocation in CRE", "Key Sectoral Allocation under PSDP 2026-27 (incl. FPA)"],
          },
        },
        notes:
          "METHODOLOGY FIX (provincial dataset consistency audit): Current Expenditure was previously 2,841.67bn (Current Revenue Expenditure 2,560.00bn + Current Capital Expenditure 281.67bn combined) — corrected to 2,560.00bn, CRE-only, to match every other Sindh year in this dataset (all of which use the 'Total G' / Current Revenue Expenditure figure alone, e.g. FY2025-26 = 2,142.0bn). The combined figure created an artificial ~32% jump in the historical trend between FY2025-26 and FY2026-27 that was a basis change, not real growth — confirmed by re-deriving both CRE (2,560.00bn) and Current Capital Expenditure (281.67bn, unchanged from FY2025-26 per the source's own 'Major Components of Expenditure' table) directly from the White Paper before correcting. Education (551.0bn) and Health (354.271bn) are current/recurring expenditure (CRE) only — each sector also has a separate, smaller PSDP/development allocation (50.12bn and 38.88bn respectively) not added in here, to avoid mixing two different classification bases. Agriculture (89.084bn) is NOT isolated in Sindh's own documents — it is bundled together with Irrigation, Livestock & Fisheries under CRE; no standalone agriculture-only figure exists in the source. Local Government (107.54bn) and Infrastructure (42.69bn, 'Works and Services') are both PSDP/development-basis figures, not current expenditure — no current-only equivalents were found. Debt Servicing and Pension are both null: not separately itemized as distinct totals in either the Budget at a Glance or White Paper for FY2026-27 — Sindh's documents consistently bundle 'Pension, Debt servicing etc.' into a single combined line (confirmed again in the FY2025-26 White Paper), with no year found so far where either is isolated. 'Other' breakdown audit (see otherBreakdown): the CRE table's own remaining residual after all named CRE sectors is explicitly labeled by the source as 'Others (including Energy, Culture, Sports & Youth Affairs, Board of Revenue, Works & Services, Women Development etc)' at Rs 868.356bn — that exact source-given list is surfaced in the UI's 'Other' info panel rather than a generic disclaimer. The remaining overall Other (allocation chart) was not affected by this fix — Current Expenditure was never one of the named slices in that chart, only a standalone KPI/trend figure; Current Capital Expenditure (281.67bn, entirely unbroken in the source) was already part of Other before and after this correction.",
      },
    ],
  },
  kp: {
    province: "kp",
    name: "Khyber Pakhtunkhwa",
    currency: "PKR",
    unit: "billion",
    years: [
      {
        fiscalYear: "2015-16",
        estimateType: "BE",
        totalOutlay: 487.884,
        developmentBudget: 174.884,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: 36.993,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/ceb73300b43e11e99081ebb7d433f2dc/download",
            ["Chapter 1 — Estimate of Receipts", "Pension object-head table"],
          ),
        },
        notes:
          "Total Budget Outlay (487.884bn): 'For Financial Year 2015-16 the total receipts are estimated at Rs. 487,884 million' — independently cross-confirmed as the prior-year reference in the FY2016-17 White Paper. Development Budget (174.884bn): 'The original size of the ADP 2015-16 was Rs 174884.00 million.' Pension (36.993bn) comes from a multi-column object-head table whose row/column alignment was less clean than later years' — flagged LOWER CONFIDENCE than other years' pension figures. All other fields left null: no clean Education/Health/Agriculture/Debt-Servicing/Own-Revenue/Federal-Transfers figures were located in a reasonable search of this document.",
      },
      {
        fiscalYear: "2016-17",
        estimateType: "BE",
        totalOutlay: 505.0,
        developmentBudget: 161.0,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: 13.0,
        pension: 40.905,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/169789e0b43111e9951bd73c7074f302/download",
            ["Chapter 1 — Estimate of Receipts", "Allocations under Current Revenue Expenditure (object-head table)"],
          ),
        },
        notes:
          "Total Budget Outlay (505.0bn): 'For financial year 2016-17 the total receipts are estimated at Rs.505,000 million which is 3.5% higher than Rs.487,884 million in financial year 2015-16' — the FY2015-16 reference here matches that year's own record exactly. Development Budget (161.0bn): 'The size of ADP, 2016-17 is Rs. 161,000.000 Million.' Debt Servicing (13.0bn) and Pension (40.905bn) are this year's Budget Estimate column in a clean 3-column [BE2016-17, RE2016-17, BE2017-18] object-head table — independently cross-confirmed since the same table's BE2017-18 column (53.0bn pension, 8.0bn debt servicing) matches FY2017-18's own record. Other fields left null.",
      },
      {
        fiscalYear: "2017-18",
        estimateType: "BE",
        totalOutlay: 603.0,
        developmentBudget: 208.0,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: 8.0,
        pension: 53.0,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/1f579aa0b42b11e98f7861111ba50e9d/download",
            ["Chapter 1 — Estimate of Receipts", "Allocations under Current Revenue Expenditure (object-head table)"],
          ),
        },
        notes:
          "Total Budget Outlay (603.0bn), Debt Servicing (8.0bn), and Pension (53.0bn) all independently cross-confirmed via both this year's own document and as the prior-year reference in the FY2018-19 White Paper. Development Budget (208.0bn): 'The size of ADP, 2017-18 is Rs. 208000.000 Million which includes Foreign Assistance of Rs.82000.000 million.' Other fields left null.",
      },
      {
        fiscalYear: "2018-19",
        estimateType: "BE",
        totalOutlay: 648.0,
        developmentBudget: 180.0,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: 9.0,
        pension: 60.088,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/82e7d2f0b42411e9be6f3737633dc94f/download",
            ["Chapter 1 — Estimate of Receipts", "Allocations under Current Revenue Expenditure (object-head table)"],
          ),
        },
        notes:
          "Total Budget Outlay (648.0bn): 'For financial year 2018-19, the total receipts are estimated at Rs. 648,000 million which is 7.5% higher than Rs. 603,000 million in financial year 2017-18' — FY2017-18 reference matches that year's own record. Debt Servicing (9.0bn) and Pension (60.088bn) from this year's BE column in the same object-head table format as FY2016-17/FY2017-18. Development Budget (180.0bn) sourced from the long-run 'Annual Development Programme Since 1973/74' historical table appearing in a later (FY2019-20) White Paper. Other fields left null.",
      },
      {
        fiscalYear: "2019-20",
        estimateType: "BE",
        totalOutlay: 900.0,
        developmentBudget: 319.0,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: 12.028,
        pension: 65.0,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/49d59b20b36a11e98ea7c30796111765/download",
            ["Chapter 1 — Estimate of Receipts", "Annual Development Programme Since 1973/74 (historical table)", "Historical Debt Servicing chart"],
          ),
        },
        notes:
          "Total Budget Outlay (900.0bn): 'For financial year 2019-20, total receipts are estimated at Rs. 900.0 billion' — independently cross-confirmed as the prior-year reference in the FY2020-21 White Paper ('923 billion are 2.5% greater than last year's budgeted figure of Rs. 900 billion'). Development Budget (319.0bn) from the historical ADP table. Debt Servicing (12.028bn) from a later White Paper's 'Historical Debt Servicing' chart covering FY2019-20 onward. Pension (65.0bn): inferred from its POSITION in a 5-value sequence (44,529 / 53,000 / 60,088 / 65,000 / 70,000) where positions 2 and 3 exactly match this dataset's already-confirmed FY2017-18 (53.0bn) and FY2018-19 (60.088bn) figures — flagged LOWER CONFIDENCE than directly-labeled figures, since position 1 (44,529) does not cleanly match FY2016-17's independently-confirmed 40.905bn. Other fields left null.",
      },
      {
        fiscalYear: "2020-21",
        estimateType: "BE",
        totalOutlay: 923.0,
        developmentBudget: 317.857,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: 12.494,
        pension: 83.6,
        ownRevenue: 49.0,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/7842c120b21511eabb2fbf5ac369eab3/download",
            ["Chapter 1 — Estimate of Receipts", "Table 12 — Current Expenditure (multi-year)", "Historical Debt Servicing chart"],
          ),
        },
        notes:
          "Total Budget Outlay (923.0bn): 'For financial year 2020-21, total receipts are estimated at Rs. 923 billion ... This includes Rs. 713 billion as General Revenue Receipts, Rs. 49 billion as Provincial Own Revenue Receipts.' Own Revenue (49.0bn) directly stated in that same sentence. Pension (83.6bn) and Debt Servicing (12.494bn) from the FY2024-25 White Paper's own retrospective 'Table 12' and 'Historical Debt Servicing' series, which both list FY2020-21 as their first column. Other fields left null.",
      },
      {
        fiscalYear: "2021-22",
        estimateType: "BE",
        totalOutlay: 1118.0,
        developmentBudget: 371.075,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: 15.446,
        pension: 91.9,
        ownRevenue: 75.0,
        federalTransfers: 559.0,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/b2fe7b00d02711eb97a07509e30f6e4d/download",
            ["Chapter 1 — Estimate of Receipts", "Table 12 — Current Expenditure (multi-year)", "Annual Development Programme Since 1973/74 (historical table)"],
          ),
        },
        notes:
          "Total Budget Outlay (1,118.0bn), Own Revenue (75.0bn), and Federal Transfers (559.0bn) all directly stated: 'For FY 2021-22, total receipts are estimated at Rs. 1,118 billion ... This includes Rs. 559 billion as Federal Transfers, Rs. 75 billion as Provincial Own Revenue Receipts.' Development Budget (371.075bn) cross-confirmed across two separate later White Papers' historical ADP tables. Pension (91.9bn) and Debt Servicing (15.446bn) from the FY2024-25 White Paper's retrospective multi-year tables.",
      },
      {
        fiscalYear: "2022-23",
        estimateType: "BE",
        totalOutlay: 1332.0,
        developmentBudget: 418.158,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: 28.066,
        pension: 112.3,
        ownRevenue: 85.0,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/46a5a210eadd11ecace7c31e81f331ae/download",
            ["Chapter 1 — Estimate of Receipts", "Table 12 — Current Expenditure (multi-year)"],
          ),
        },
        notes:
          "Total Budget Outlay (1,332.0bn) and Own Revenue (85.0bn): 'For FY 2022-23, total receipts are estimated at Rs. 1,332 billion ... Rs. 570.8 billion as Federal Tax Assignment, Rs. 85 billion as Provincial Own Revenue Receipts.' Federal Transfers left null rather than use the narrower 'Federal Tax Assignment' figure (570.8bn) — that figure excludes other transfer components (war-on-terror compensation, merged-district grants) that the broader 'Federal Transfers' figure used in other years (e.g. FY2021-22, FY2024-25) includes, and using it here would break basis-consistency across the time series. Development Budget (418.158bn) cross-confirmed across two separate later White Papers. Pension (112.3bn) and Debt Servicing (28.066bn) from the FY2024-25 White Paper's retrospective tables.",
      },
      {
        fiscalYear: "2023-24",
        estimateType: "BE",
        totalOutlay: 1456.7,
        developmentBudget: 301.095,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: 266.2,
        infrastructure: null,
        debtServicing: 41.0,
        pension: 138.3,
        ownRevenue: 85.0,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/6c1cd0a00f6d11efb6db298eb4a91f53/download",
            ["Chapter 1 — Estimate of Receipts", "Table 12 — Current Expenditure (multi-year)", "Table 13 — Share of Local Government in Current Expenditure (multi-year)"],
          ),
        },
        notes:
          "Total Budget Outlay (1,456.7bn) and Own Revenue (85.0bn): 'For FY 2023-24, total receipts are estimated at Rs. 1,456.7 billion ... Rs. 764.6 billion as Federal Tax Assignment, Rs. 85 billion as Provincial Own Revenue Receipts' — same Federal-Tax-Assignment-vs-Federal-Transfers basis gap as FY2022-23, left null. Local Government (266.2bn, Settled Districts current-expenditure share) and Pension (138.3bn) and Debt Servicing (41.0bn) all from the FY2024-25 White Paper's retrospective multi-year tables, which list FY2023-24 as a Budget-Estimate column. Development Budget (301.095bn) from the same White Paper's historical ADP table.",
      },
      {
        fiscalYear: "2024-25",
        estimateType: "BE",
        totalOutlay: 1754.0,
        developmentBudget: 416.284,
        currentExpenditure: 797.6,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: 303.7,
        infrastructure: null,
        debtServicing: 67.0,
        pension: 166.8,
        ownRevenue: 93.5,
        federalTransfers: 1100.7,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/c0661a80199711efa64c3d183ddc8e45/download",
            ["Chapter 2 — Estimate of Receipts", "Table 12 — Current Expenditure", "Table 13 — Share of Local Government in Current Expenditure", "Annual Development Programme Since 1973/74", "6.5 Historical Debt Servicing"],
          ),
        },
        notes:
          "Total Budget Outlay (1,754.0bn), General Revenue Receipts (1,305.5bn), Federal Transfers (1,100.7bn), and Own Revenue (93.5bn) all directly stated in Chapter 2: 'total receipts are estimated at Rs. 1,754.0 billion ... federal transfers are budgeted at Rs. 1,100.7 billion ... provincial own-source revenue at Rs. 93.5 billion.' Current Expenditure (797.6bn) and Pension (166.8bn) are Table 12's own FY2024-25 Budget column. Local Government (303.7bn) is Table 13's FY2024-25 column. Debt Servicing (67.0bn) from the document's own 'Historical Debt Servicing' chart. Development Budget (416.284bn) is flagged in the source document itself with an asterisk ('*Includes PSDP'), meaning its basis is broader than earlier years' ADP-only figures — noted here as a basis difference, not corrected, since the source document does not provide an ADP-only breakout for this year. Education/Health/Agriculture/Infrastructure: a 'Table 18' department-wise development breakdown exists but its multi-line department names and figures could not be reliably re-paired after PDF text extraction (the same column-merging problem encountered throughout this exercise) — left null rather than risk misattribution.",
      },
      {
        fiscalYear: "2025-26",
        estimateType: "BE",
        totalOutlay: 2119.0,
        developmentBudget: 547.0,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: 150.0,
        pension: 195.0,
        ownRevenue: 129.0,
        federalTransfers: null,
        fiscalBalance: 157.0,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/b295fc70527711f09376d72f1a0e94f0/download",
            ["Executive Summary"],
          ),
        },
        notes:
          "All figures from the Executive Summary's own prose: 'Total revenues for the year are projected at Rs. 2,119 billion, while total expenditures are estimated at Rs. 1,962 billion' (a surplus of 157bn, matching the separately-stated 'surplus budget of Rs. 157 billion' exactly). 'The province has budgeted its own-source revenue at Rs. 129 billion ... Rs. 150 billion is set aside to manage government debt ... salary bill is Rs. 680.8 billion, and pensions are budgeted at Rs. 195 billion. Development spending is set at Rs. 547 billion.' Federal Transfers left null: only Net Hydel Profits (106bn) was isolated as a sub-component, not the full federal-transfers figure. Current Expenditure left null rather than derive it by subtracting Development (547.0) from Total Expenditure (1,962.0) — that would be arithmetic inference from two source figures rather than a directly-stated document figure.",
      },
      {
        fiscalYear: "2026-27",
        estimateType: "BE",
        totalOutlay: 2170.0,
        developmentBudget: 524.3,
        currentExpenditure: 1645.7,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: 485.1,
        infrastructure: 39.49,
        debtServicing: 71.0,
        pension: 207.1,
        ownRevenue: 182.4,
        federalTransfers: 1319.2,
        fiscalBalance: -48.0,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/3c7474d06bc311f196cf213de7f9c61e/download",
            ["Budget at Glance", "Table 13: Details of Provincial Expenditure", "Table 18: Development Expenditure", "Table 29: Principal and Interest Repayments", "Pension multi-year table"],
          ),
        },
        notes:
          "Education, Health, and Agriculture are null, not zero: the FY2026-27 White Paper dropped the dedicated sectoral narrative chapters present in the FY2025-26 edition, leaving only small ADP (development-only) sub-allocations (e.g. Elementary & Secondary Education ADP: 7.25bn, Higher Education ADP: 5.56bn, Health ADP: 16.33bn, Agriculture ADP: 5.24bn) with no combined current+development total stated anywhere — reporting the ADP sliver alone as 'Education' or 'Health' would understate these sectors by an order of magnitude, since current/recurring spending (salaries, schools, hospitals already running) is excluded. Local Government (485.1bn) sums two tables: 'Share of Local Government in Current Expenditure' for Settled Districts (412.3bn) and Merged Districts (72.8bn) — a genuine current-basis figure, unlike the education/health/agriculture gap above. Infrastructure (39.49bn, 'Roads') is ADP/development-basis — KP's FY2026-27 edition has no 'Communication & Works' department label at all (split into Roads/Transport/Energy & Power). Debt Servicing (71.0bn) combines Interest (26.0bn) and Principal Repayment (45.0bn) on foreign debt, per Table 29. Pension (207.1bn) is this year's column in a 4-column multi-year table (165.8 / 195.0 / 186.2 / 207.1) whose 2nd column (195.0) exactly matches FY2025-26's own independently-confirmed pension figure, giving confidence in the column alignment. 'Other' breakdown audit: the single largest identifiable component of the remaining Other is Salary (Rs 753.7bn, Table 14) — deliberately NOT added as its own slice, because salary spending is already partly embedded inside the Local Government figure above (devolved-department salaries flow through the PFC current-expenditure share) and isolating a province-wide salary total without double-subtracting that overlap was not possible from the tables available. No other named department-level total beyond what's already listed was found in this edition.",
      },
    ],
  },
  balochistan: {
    province: "balochistan",
    name: "Balochistan",
    currency: "PKR",
    unit: "billion",
    years: [
      {
        fiscalYear: "2017-18",
        estimateType: "BE",
        totalOutlay: 276.371,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: 12.401,
        federalTransfers: 229.974,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://web.archive.org/web/20210707045219id_/https://www.finance.gob.pk/wp-content/uploads/2021/01/White-Paper-Budget-2017-18.pdf",
            ["Table 1.1 — Total Provincial Receipts"],
          ),
        },
        notes:
          "Retrieved via the Wayback Machine — the live URL 404s (see per-province source audit). Total Budget Outlay (276.371bn), Own Revenue (12.401bn, Provincial Taxes + Non-Tax only), and Federal Transfers (229.974bn) are all this document's own BE2017-18 column in Table 1.1. Development/Current Expenditure split, sector fields, Pension, Debt Servicing, and Fiscal Balance were not locatable as clean figures in a reasonable search of this document and are left null.",
      },
      {
        fiscalYear: "2018-19",
        estimateType: "BE",
        totalOutlay: 279.907,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: 13.068,
        federalTransfers: 254.299,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://web.archive.org/web/20210707045223id_/https://www.finance.gob.pk/wp-content/uploads/2021/01/White-Paper-on-Budget-2018-19.pdf",
            ["Provincial Consolidated Fund Receipts table — figures taken from FY2019-20 White Paper's comparison column, not this document directly"],
          ),
        },
        notes:
          "FLAGGED LOWER CONFIDENCE: this year's own White Paper (retrieved via Wayback Machine) turned out to be mostly narrative/scanned content with very little machine-readable tabular data (only 832 text lines extracted from an 18MB file). All three figures here (Total Outlay 279.907bn, Own Revenue 13.068bn, Federal Transfers 254.299bn) were instead read from the FY2019-20 White Paper's own multi-year comparison table, where a column plausibly corresponding to FY2018-19 sits between confirmed FY2017-18 and FY2019-20 columns — the column's exact estimate-type (BE vs RE) could not be definitively labeled. Other fields left null.",
      },
      {
        fiscalYear: "2019-20",
        estimateType: "BE",
        totalOutlay: 372.213,
        developmentBudget: 126.343,
        currentExpenditure: 293.58,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: 34.182,
        federalTransfers: 319.889,
        fiscalBalance: -47.71,
        citations: {
          ...bib(
            "White Paper",
            "https://web.archive.org/web/20210707045217id_/https://www.finance.gob.pk/wp-content/uploads/2021/01/White-Paper-on-Budget-GoB-2019-20.pdf",
            ["Provincial Consolidated Fund Receipts", "Provincial Consolidated Fund Payments"],
          ),
        },
        notes:
          "Retrieved via the Wayback Machine. All figures are this document's own clean, fully-labeled BE2019-20 column (Receipts table gives Total Outlay/Own Revenue/Federal Transfers; Payments table gives Current/Development Expenditure). Fiscal Balance (-47.71bn) is the document's own 'Net Consolidated Fund Receipts and Payments' line — note Receipts (372.213bn) is smaller than Current+Development Expenditure (419.923bn) by exactly this amount, i.e. the deficit is financed outside the receipts total shown here (borrowing/carryover), not a calculation error. Own Revenue includes a one-off 'Non-tax Revenue (Gas Lease Ext. Bonus)' of 13.031bn — flagged since it inflates this year's figure relative to a typical year. Sector fields, Pension, and Debt Servicing left null.",
      },
      {
        fiscalYear: "2020-21",
        estimateType: "BE",
        totalOutlay: null,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://web.archive.org/web/20210707045218id_/https://www.finance.gob.pk/wp-content/uploads/2020/08/White-Paper-2020-21.pdf",
            ["Federal Divisible Pool table only — no clean province-wide total located"],
          ),
        },
        notes:
          "Retrieved via the Wayback Machine, but this document's overall Receipts/Payments summary table (the same format that worked for FY2017-18/FY2019-20) could not be located — only a partial Federal Divisible Pool breakdown (251.664bn BE2020-21) was found, which is a sub-component, not the full Federal Transfers figure, so not used. All fields left null rather than risk reporting an incomplete or misattributed figure.",
      },
      {
        fiscalYear: "2021-22",
        estimateType: "BE",
        totalOutlay: null,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          summary: {
            document: "White Paper",
            url: "https://web.archive.org/web/20210707045218id_/https://www.finance.gob.pk/wp-content/uploads/2021/06/WHITE-PAPER-2021-22-Layout-R-3-LR_compressed.pdf",
            tables: [],
          },
        },
        notes:
          "Retrieved via the Wayback Machine (confirmed real PDF, 20 pages), but this document's overall Receipts/Payments summary table could not be located in a reasonable search — it discusses Federal Divisible Pool performance narratively but without the clean BE-column table format other years used. All fields left null.",
      },
      {
        fiscalYear: "2022-23",
        estimateType: "BE",
        totalOutlay: null,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          summary: { document: "White Paper", url: "https://web.archive.org/web/20240805090902id_/https://www.finance.gob.pk/wp-content/uploads/2023/07/White-Paper-2023-24-FINAL.pdf", tables: [] },
        },
        notes:
          "No FY2022-23 White Paper could be located via the Wayback Machine CDX index (the archived snapshots jump from FY2021-22 to FY2023-24) after reasonable effort, matching the per-province source audit's prediction that this specific year might be unrecoverable. All fields left null rather than estimated. The citation URL points to the FY2023-24 White Paper (which would carry FY2022-23 as a comparison column) as the most likely future source if revisited, not a document that was actually used for FY2022-23 figures here.",
      },
      {
        fiscalYear: "2023-24",
        estimateType: "BE",
        totalOutlay: 701.42,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: null,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://web.archive.org/web/20241125140400id_/https://www.finance.gob.pk/wp-content/uploads/2024/07/White-Paper-FY-2024-25.pdf",
            ["E. TOTAL RECEIPTS (A+B+C+D) — FY2023-24 comparison column"],
          ),
        },
        notes:
          "Total Outlay (701.42bn) is taken from the FY2024-25 White Paper's own 'E. TOTAL RECEIPTS' comparison row, which clearly labels its three columns Accounts/BE/RE for FY2023-24 plus BE for FY2024-25. An EARLIER attempt to read this figure from FY2023-24's own White Paper produced a materially different, lower number (503.5bn) from a more heavily garbled table in that document — discarded in favor of this more clearly-labeled, cross-document figure. All other fields left null.",
      },
      {
        fiscalYear: "2024-25",
        estimateType: "BE",
        totalOutlay: 955.602,
        developmentBudget: null,
        currentExpenditure: null,
        education: null,
        health: null,
        agriculture: null,
        localGovernment: null,
        infrastructure: null,
        debtServicing: null,
        pension: null,
        ownRevenue: 59.111,
        federalTransfers: null,
        fiscalBalance: null,
        citations: {
          ...bib(
            "White Paper",
            "https://web.archive.org/web/20241125140400id_/https://www.finance.gob.pk/wp-content/uploads/2024/07/White-Paper-FY-2024-25.pdf",
            ["E. TOTAL RECEIPTS (A+B+C+D)", "(b) PROVINCIAL OWN RECEIPTS"],
          ),
        },
        notes:
          "Total Outlay (955.602bn) and Own Revenue (59.111bn) are this document's own clearly-labeled BE2024-25 column. Own Revenue includes a one-off 'PPL receipts (Lease Extension Bonus)' of 47.688bn — flagged since it materially inflates this year's figure (without it, recurring own-source revenue would be roughly 11.4bn). Federal Transfers and sector fields left null: the (a) Federal Receipts row total was not cleanly captured in the search performed.",
      },
      {
        fiscalYear: "2025-26",
        estimateType: "BE",
        totalOutlay: 1028.278,
        developmentBudget: 336.576,
        currentExpenditure: 639.876,
        education: 137.547,
        health: 59.733,
        agriculture: 10.17,
        localGovernment: 12.91,
        infrastructure: 54.714,
        debtServicing: 129.71,
        pension: 90.236,
        ownRevenue: 124.879,
        federalTransfers: 743.165,
        fiscalBalance: 51.826,
        otherBreakdown: [
          { label: "Irrigation", value: 32.328, note: "Table 23: Major Sectoral Allocation — PSDP basis, same table and basis as Agriculture/Local Government/Infrastructure above." },
          { label: "Science & Information Technology", value: 12.661, note: "Table 23: Major Sectoral Allocation — PSDP basis." },
        ],
        otherResidualNote:
          "Table 23 also lists 'Public Health Services' (17.2bn) and 'School & Higher Education' (19.3bn) as PSDP-basis figures, but these are not added as separate slices since Health and Education above already use a larger current-expenditure basis — showing both would look like a doubled, inconsistent number for the same sector rather than additional money. Table 23's eight listed sectors account for 70% of total Provincial PSDP; the remainder of PSDP plus all of Current Capital Expenditure is not broken into named departments in the source documents reviewed.",
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gob.pk/wp-content/uploads/2025/07/WHITE-PAPER-2025-26.pdf",
            ["Table 1: Overall Summary of Receipts & Payments", "Table 5: Estimate of Federal Transfers", "Table 23: Major Sectoral Allocation"],
          ),
          sectoral: {
            document: "Annual Budget Statement",
            url: "https://www.finance.gob.pk/wp-content/uploads/2025/07/ABS-2025-26.pdf",
            tables: ["Estimates of Expenditure (Function Summary)", "Estimates of Expenditure (Object Summary)", "BC21006 — Pensions (Demand Summary)"],
          },
        },
        notes:
          "FY2025-26 is the latest year verified for Balochistan — the live finance.gob.pk site has no confirmed FY2026-27 document yet (a 2025 site redesign broke most pre-2025 archive links, so historical depth here is weaker than the other three provinces; see the per-province source audit). Education and Health are current/functional expenditure; Agriculture (10.17bn), Local Government (12.91bn), and Infrastructure (54.714bn, 'Communication & Works') are PSDP/development-basis figures from Table 23's narrative text, since no current-only equivalents were isolated. Debt Servicing (129.71bn) combines Interest Payment (116.61bn) and Principal Repayment (13.10bn) object-classification lines — not the much narrower 'Debt Servicing and Other Obligations' budget Demand (BC2400A, 4.74bn), which is a specific administrative demand, not the province's total debt-service cost. Pension (90.236bn) is the ABS's own object-classification line 'BC21006 Pensions', Budget Estimates 2025-26 column — independently re-derived in the backfill pass and consistent with the BC2400A cross-check already documented above. Fiscal Balance is a surplus.",
      },
    ],
  },
};

export function getProvinceDataset(province: ProvinceId): ProvincialBudgetDataset {
  return PROVINCIAL_BUDGET_HISTORICAL[province];
}

export const ALL_PROVINCE_IDS: ProvinceId[] = ["punjab", "sindh", "kp", "balochistan"];
