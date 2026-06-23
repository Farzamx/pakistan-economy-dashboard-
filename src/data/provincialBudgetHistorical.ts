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

export interface ProvincialBudgetYearRecord {
  fiscalYear: string;
  estimateType: "BE";

  totalOutlay: number;
  developmentBudget: number | null;
  currentExpenditure: number | null;
  education: number | null;
  health: number | null;
  agriculture: number | null;
  localGovernment: number | null;
  infrastructure: number | null;
  debtServicing: number | null;
  ownRevenue: number | null;
  federalTransfers: number | null;
  /** Signed — negative means deficit, positive means surplus. */
  fiscalBalance: number | null;

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
        ownRevenue: 1209.9,
        federalTransfers: 4390.9,
        fiscalBalance: 910.0,
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
        fiscalYear: "2026-27",
        estimateType: "BE",
        totalOutlay: 3562.06,
        developmentBudget: 720.385,
        currentExpenditure: 2841.67,
        education: 551.0,
        health: 354.271,
        agriculture: 89.084,
        localGovernment: 107.54,
        infrastructure: 42.69,
        debtServicing: null,
        ownRevenue: 775.06,
        federalTransfers: 2263.19,
        fiscalBalance: -36.94,
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
          "Education (551.0bn) and Health (354.271bn) are current/recurring expenditure (CRE) only — each sector also has a separate, smaller PSDP/development allocation (50.12bn and 38.88bn respectively) not added in here, to avoid mixing two different classification bases. Agriculture (89.084bn) is NOT isolated in Sindh's own documents — it is bundled together with Irrigation, Livestock & Fisheries under CRE; no standalone agriculture-only figure exists in the source. Local Government (107.54bn) and Infrastructure (42.69bn, 'Works and Services') are both PSDP/development-basis figures, not current expenditure — no current-only equivalents were found. Debt Servicing is null: not separately itemized as a distinct total in either the Budget at a Glance or White Paper for FY2026-27 — only a prior-year (FY2025-26) debt repayment figure (45.8bn) appears in narrative text, which is not used here since it isn't this year's figure.",
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
        ownRevenue: 182.4,
        federalTransfers: 1319.2,
        fiscalBalance: -48.0,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gkp.pk/attachments/3c7474d06bc311f196cf213de7f9c61e/download",
            ["Budget at Glance", "Table 13: Details of Provincial Expenditure", "Table 18: Development Expenditure", "Table 29: Principal and Interest Repayments"],
          ),
        },
        notes:
          "Education, Health, and Agriculture are null, not zero: the FY2026-27 White Paper dropped the dedicated sectoral narrative chapters present in the FY2025-26 edition, leaving only small ADP (development-only) sub-allocations (e.g. Elementary & Secondary Education ADP: 7.25bn, Higher Education ADP: 5.56bn, Health ADP: 16.33bn, Agriculture ADP: 5.24bn) with no combined current+development total stated anywhere — reporting the ADP sliver alone as 'Education' or 'Health' would understate these sectors by an order of magnitude, since current/recurring spending (salaries, schools, hospitals already running) is excluded. Local Government (485.1bn) sums two tables: 'Share of Local Government in Current Expenditure' for Settled Districts (412.3bn) and Merged Districts (72.8bn) — a genuine current-basis figure, unlike the education/health/agriculture gap above. Infrastructure (39.49bn, 'Roads') is ADP/development-basis — KP's FY2026-27 edition has no 'Communication & Works' department label at all (split into Roads/Transport/Energy & Power). Debt Servicing (71.0bn) combines Interest (26.0bn) and Principal Repayment (45.0bn) on foreign debt, per Table 29.",
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
        ownRevenue: 124.879,
        federalTransfers: 743.165,
        fiscalBalance: 51.826,
        citations: {
          ...bib(
            "White Paper",
            "https://www.finance.gob.pk/wp-content/uploads/2025/07/WHITE-PAPER-2025-26.pdf",
            ["Table 1: Overall Summary of Receipts & Payments", "Table 5: Estimate of Federal Transfers", "Table 23: Major Sectoral Allocation"],
          ),
          sectoral: {
            document: "Annual Budget Statement",
            url: "https://www.finance.gob.pk/wp-content/uploads/2025/07/ABS-2025-26.pdf",
            tables: ["Estimates of Expenditure (Function Summary)", "Estimates of Expenditure (Object Summary)"],
          },
        },
        notes:
          "FY2025-26 is the latest year verified for Balochistan — the live finance.gob.pk site has no confirmed FY2026-27 document yet (a 2025 site redesign broke most pre-2025 archive links, so historical depth here is weaker than the other three provinces; see the per-province source audit). Education and Health are current/functional expenditure; Agriculture (10.17bn), Local Government (12.91bn), and Infrastructure (54.714bn, 'Communication & Works') are PSDP/development-basis figures from Table 23's narrative text, since no current-only equivalents were isolated. Debt Servicing (129.71bn) combines Interest Payment (116.61bn) and Principal Repayment (13.10bn) object-classification lines — not the much narrower 'Debt Servicing and Other Obligations' budget Demand (BC2400A, 4.74bn), which is a specific administrative demand, not the province's total debt-service cost. Fiscal Balance is a surplus.",
      },
    ],
  },
};

export function getProvinceDataset(province: ProvinceId): ProvincialBudgetDataset {
  return PROVINCIAL_BUDGET_HISTORICAL[province];
}

export const ALL_PROVINCE_IDS: ProvinceId[] = ["punjab", "sindh", "kp", "balochistan"];
