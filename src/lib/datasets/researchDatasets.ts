// Download Datasets: curated RESEARCH datasets.
//
// These are finished, validated files prepared for academic research, published exactly as built. They are deliberately NOT part of the live indicator
// catalogue (datasetRegistry.ts): they are not loaded through the canonical data functions, they are not frequency-filtered, and nothing here converts or
// regenerates them. The page offers them as downloads of the files themselves.
//
// The files live in public/research-datasets/<dir>/ (served only to signed-in visitors, like the page: see accessPolicy.ts). Each entry records the size
// and SHA-256 of the file as validated, and researchDatasets.test.ts re-reads every file and fails if a byte differs or an unlisted file appears.
//
// Pure and client-safe: no I/O.

import type { FrequencyId } from "./datasetFrequency";

export type ResearchFileKind = "xlsx" | "csv" | "pdf" | "sps" | "csv-derived" | "csv-variable";

export interface ResearchFile {
  kind: ResearchFileKind;
  /** Button text. */
  label: string;
  /** Short button text, when the format alone does not say which file this is (e.g. one CSV per variable). */
  shortLabel?: string;
  /** Exactly the name the file has on disk and in the codebook / SPSS syntax that refer to it. */
  filename: string;
  /** One line saying what the file is for. */
  description: string;
  bytes: number;
  /** SHA-256 of the validated file, lowercase hex. */
  sha256: string;
  /** Offered as an extra, not one of the main downloads. */
  optional?: boolean;
}

/**
 * How complete the dataset is, in numbers a reader can check against the files themselves (researchDatasets.test.ts recomputes every figure from the published
 * CSV and from the workbook's own Coverage Matrix sheet, so this block cannot drift from the files).
 */
export interface ResearchCompleteness {
  /** "Version 2" */
  version: string;
  /** Date the version was built, ISO. */
  versionDate: string;
  /** Variable-year cells: variables x years. */
  cells: number;
  /** Cells that hold an observation. */
  observationsAvailable: number;
  missing: number;
  /** Variables observed in all 30 years / in some but not all of them. */
  completeVariables: number;
  partialVariables: number;
  /**
   * Why each blank cell is blank. The nine counts add up to `missing`; each is one reason code of the workbook's Coverage Matrix sheet (shown in brackets).
   * Structural (not data loss, never filled): beforeSeriesExists, otherCpiBaseColumn, noSurvey. Deliberately not spliced: companionColumn.
   * The source has stopped or has not published yet: sourceStopped, notYetPublished. Genuinely unresolved: needsReconciliation, unverified, tbillTooFewMonths.
   */
  missingBy: {
    /** [PRE] before the series exists in its source (e.g. the SBP target rate before May 2016). */
    beforeSeriesExists: number;
    /** [BASE] outside this CPI base-year column; another base-year column covers the year. */
    otherCpiBaseColumn: number;
    /** [SURVEY] poverty: no household survey that year. */
    noSurvey: number;
    /** [ALT] covered by the companion column of the same indicator (Ministry of Finance vs SBP classification), deliberately not spliced. */
    companionColumn: number;
    /** [DISC] the source series has stopped. */
    sourceStopped: number;
    /** [LAG] not yet published / not in the vintage used. */
    notYetPublished: number;
    /** [REC] not published in this form; would need a methodological reconciliation that has not been made. */
    needsReconciliation: number;
    /** [UNV] a candidate value exists (SBP reserves FY1996-FY2000) but could not be verified as the same published concept. */
    unverified: number;
    /** [GAP] T-bill rate 2018: only 6 of the 12 monthly values the approved rule requires. */
    tbillTooFewMonths: number;
  };
}

/**
 * Observation counts for ONE variable of a small dataset, so the page can state exactly how many years each variable has (researchDatasets.moneyRates.test.ts
 * recomputes every figure from the published CSV).
 */
export interface VariableCoverage {
  /** Column name in the CSV. */
  variable: string;
  /** Plain-language name. */
  label: string;
  observations: number;
  /** First and last fiscal year that has a value, e.g. "FY1995-96". */
  first: string;
  last: string;
  /** Fiscal years that are blank, in the dataset's own labels. */
  missing: readonly string[];
}

export interface ResearchDataset {
  id: string;
  /** Directory under public/research-datasets/. */
  directory: string;
  title: string;
  description: string;
  /** "FY1995-96 to FY2024-25" */
  coverage: string;
  /** First and last fiscal year, labelled by the year each ends. */
  firstYear: number;
  lastYear: number;
  /** The ONLY frequencies this dataset is offered at. Annual observations are never converted into quarterly or monthly ones. */
  availableFrequencies: readonly FrequencyId[];
  frequencyLabel: string;
  /** Number of master variables (excluding the year and fiscal_year columns), and of rows. */
  variables: number;
  observations: number;
  /** Variables in the optional derived-variables file. */
  derivedVariables: number;
  /** Completeness block of the large 30-year dataset (reason codes for every blank cell). Absent for a dataset described by `variableCoverage` instead. */
  completeness?: ResearchCompleteness;
  /** Version label, shown as a badge when the dataset has no `completeness` block. */
  version?: string;
  versionDate?: string;
  /** Per-variable observation counts, for a dataset with few enough variables to list them all. */
  variableCoverage?: readonly VariableCoverage[];
  /** One sentence about missing data shown on the card itself (the details sit in the notes). */
  missingDataNote?: string;
  sources: readonly string[];
  files: readonly ResearchFile[];
  /** Plain statements a reader needs before using the data. */
  notes: readonly string[];
}

/** The large 30-year dataset always carries the reason-coded completeness block. */
export type MacroResearchDataset = ResearchDataset & { completeness: ResearchCompleteness };

export const PAKISTAN_30_YEAR: MacroResearchDataset = {
  id: "pakistan-30-year-macro",
  directory: "pakistan-30-year",
  title: "Pakistan — 30-Year Macroeconomic Dataset",
  description:
    "An annual historical dataset covering Pakistan's macroeconomic performance, including GDP growth, inflation, fiscal trends, exchange rates, external accounts and other economic indicators.",
  coverage: "FY1995-96 to FY2024-25",
  firstYear: 1996,
  lastYear: 2025,
  availableFrequencies: ["yearly"],
  frequencyLabel: "Annual",
  variables: 71,
  observations: 30,
  derivedVariables: 25,
  completeness: {
    version: "Version 2",
    versionDate: "2026-11-20",
    cells: 2130,
    observationsAvailable: 1856,
    missing: 274,
    completeVariables: 45,
    partialVariables: 26,
    missingBy: {
      beforeSeriesExists: 49,
      otherCpiBaseColumn: 84,
      noSurvey: 36,
      companionColumn: 56,
      sourceStopped: 20,
      notYetPublished: 9,
      needsReconciliation: 14,
      unverified: 5,
      tbillTooFewMonths: 1,
    },
  },
  sources: ["World Bank", "IMF", "Ministry of Finance", "State Bank of Pakistan"],
  files: [
    {
      kind: "xlsx",
      label: "Excel workbook (.xlsx)",
      filename: "Pakistan_Macroeconomic_Data_30_Years_v2.xlsx",
      description: "Master dataset, data dictionary, sources, data-quality report, derived variables, change log and coverage matrix.",
      bytes: 152694,
      sha256: "1f3d16069a6c56b8b1553cfdad9f4f5d943d91761f1f8b8074d905f2638a4439",
    },
    {
      kind: "csv",
      label: "CSV dataset (.csv)",
      filename: "Pakistan_Macroeconomic_Data_30_Years_v2.csv",
      description: "The master dataset for statistical software: one row per fiscal year, blank cells where the source publishes nothing.",
      bytes: 20472,
      sha256: "e7e2c618670cc21e374b9ff728a70d4dc99d30a452d26cf10d44aaf8dcdf6bc9",
    },
    {
      kind: "pdf",
      label: "Codebook (.pdf)",
      filename: "Pakistan_Macroeconomic_Data_Codebook_v2.pdf",
      description: "Every variable, its unit, period basis, coverage and source, plus the dataset's limitations.",
      bytes: 34797,
      sha256: "45e99855db17d892c1193d9f082957da857c43f31f1030a72ee968db2aba4df5",
    },
    {
      kind: "sps",
      label: "SPSS import syntax (.sps)",
      filename: "Pakistan_Macroeconomic_Data_Import_v2.sps",
      description: "Reads the CSV into IBM SPSS Statistics with every variable labelled. Edit the folder in its FILE line first.",
      bytes: 18290,
      sha256: "1d1aad86e652f5b28ebf4b748b188a5d9423ab75d3db24c6722c11732d7cc532",
    },
    {
      kind: "csv-derived",
      label: "Derived variables (.csv)",
      filename: "Pakistan_Macroeconomic_Data_30_Years_Derived_v2.csv",
      description: "Optional. Annual changes, ratios, fiscal-year exchange rates and a T-bill average calculated from the master data, each with its formula in the workbook.",
      bytes: 7040,
      sha256: "2ebd25b1616f8b2e9112311dc07d4270f734e3b99b0907c68a0125b333e2382b",
      optional: true,
    },
  ],
  notes: [
    "Annual fiscal-year observations only (a fiscal year runs 1 July to 30 June and is labelled by the year it ends). It is not offered quarterly or monthly, and no observation has been converted, interpolated or repeated.",
    "Not every variable has 30 years of data: see Coverage at a glance. A blank cell means the source does not publish that observation (or, for a structural gap, that the series does not apply to that year); it is never zero, and structural gaps are never filled.",
    "Food inflation is published on four PBS CPI base years (1990-91, 2000-01, 2007-08 and 2015-16). They are separate columns that overlap and disagree in some years, and are never spliced into one series.",
    "Variable names say whether a series is fiscal-year (_fy_) or calendar-year (_cy_): do not mix the two in one model without aligning them. External debt is published twice for the same reason: at end-June (SBP, fiscal year) and at end-December (World Bank, calendar year).",
    "Where sources disagree both versions are kept in separate columns, and known series breaks are flagged: for example the current account changes compilation standard at FY2003 (BPM4 to FY2002, BPM6 from FY2003), and tax revenue and development expenditure appear both as Ministry of Finance (primary) and SBP (alternative) columns that classify items differently.",
    "Version 2 corrects three values, adds 121 officially recovered observations (SBP M2, consolidated revenue, expenditure and interest, and food inflation on the 1990-91 base) and adds series from the State Bank of Pakistan and the World Bank (external debt, workers' remittances and the current account on a fiscal-year basis). Sources: World Bank, IMF, Ministry of Finance and the State Bank of Pakistan, including its Handbook of Statistics. Every change is listed in the workbook's Change Log sheet.",
    "The workbook's Sources sheet and the codebook cite the scripts and raw downloads used to build the dataset. Those are kept internally and are not published here.",
  ],
};

/**
 * Money supply (M2) and interest rates: four annual variables for one research question, FY1995-96 to FY2024-25. Built from official SBP, PBS and Ministry of
 * Finance data; no value is interpolated or estimated. Its own directory, so the 30-year dataset's files are untouched.
 */
export const PAKISTAN_M2_INTEREST_RATES: ResearchDataset = {
  id: "pakistan-m2-interest-rates",
  directory: "pakistan-m2-interest-rates",
  title: "Pakistan Money Supply and Interest Rates Dataset (1995–2025)",
  description:
    "Annual M2 growth, SBP policy rate, CPI inflation and the calculated real interest rate for Pakistan, prepared for research on the relationship between money supply and interest rates.",
  coverage: "FY1995-96 to FY2024-25",
  firstYear: 1996,
  lastYear: 2025,
  availableFrequencies: ["yearly"],
  frequencyLabel: "Annual",
  variables: 4,
  observations: 30,
  derivedVariables: 0,
  version: "Version 1",
  versionDate: "2026-11-20",
  variableCoverage: [
    { variable: "m2_growth_pct", label: "M2 growth", observations: 29, first: "FY1995-96", last: "FY2024-25", missing: ["FY2019-20"] },
    { variable: "sbp_policy_rate_pct", label: "SBP policy rate", observations: 30, first: "FY1995-96", last: "FY2024-25", missing: [] },
    { variable: "cpi_inflation_pct", label: "CPI inflation", observations: 30, first: "FY1995-96", last: "FY2024-25", missing: [] },
    { variable: "real_policy_rate_pct", label: "Real policy rate (approximate)", observations: 30, first: "FY1995-96", last: "FY2024-25", missing: [] },
  ],
  missingDataNote: "FY2019-20 M2 growth is blank because SBP revised its M2 data that year. Nothing is estimated, interpolated or filled.",
  sources: ["State Bank of Pakistan", "Pakistan Bureau of Statistics", "Ministry of Finance"],
  files: [
    {
      kind: "xlsx",
      label: "Excel workbook (.xlsx)",
      shortLabel: "Download Excel Workbook (.xlsx)",
      filename: "Pakistan_M2_Interest_Rates_Dataset_v1.xlsx",
      description: "Combined dataset and one sheet per variable, with the calculation sheets, data dictionary, sources, coverage and validation results.",
      bytes: 34679,
      sha256: "9604466803b47966206ef3fa8d418347c39bd38c9f4f068544c28cd3f5c00cd7",
    },
    {
      kind: "csv",
      label: "Combined variables (.csv)",
      shortLabel: "Download Combined Dataset (.csv)",
      filename: "Pakistan_M2_Interest_Rates_Combined_v1.csv",
      description: "All four variables, one row per fiscal year, ready for Excel and SPSS. Blank cells where there is no verifiable observation.",
      bytes: 1229,
      sha256: "2ff24740f8a4f75a2437ac493075685dc6bcafaed3a37a5b853b0a5e9afe7062",
    },
    {
      kind: "pdf",
      label: "Codebook and methodology (.pdf)",
      shortLabel: "Download Codebook & Methodology (.pdf)",
      filename: "Pakistan_M2_Interest_Rates_Codebook_v1.pdf",
      description: "Definitions, units, sources, calculation methods, coverage, missing-data notes, limitations and validation summary.",
      bytes: 15772,
      sha256: "b4230a494063007a9ea2185c25481d9b9a180c0a1bd7c20675df1e47fe12db98",
    },
    {
      kind: "sps",
      label: "SPSS import syntax (.sps)",
      shortLabel: "Download SPSS Syntax (.sps)",
      filename: "Pakistan_M2_Interest_Rates_Import_v1.sps",
      description: "Reads the combined CSV into IBM SPSS Statistics with every variable labelled. Edit the folder in its FILE line first.",
      bytes: 1451,
      sha256: "3c93eeee266615f00c0eeef3b27acd5536d0a1767d877e2e8d4122b1d0e2ea19",
    },
    {
      kind: "csv-variable",
      label: "M2 growth (.csv)",
      shortLabel: "M2 Growth — CSV",
      filename: "Pakistan_M2_Growth_v1.csv",
      description: "M2 growth alone: year, fiscal year and m2_growth_pct.",
      bytes: 681,
      sha256: "7361e633f431a68d2dac1b2f9215e6c079374eb1120114f65abe225f1dffa68f",
    },
    {
      kind: "csv-variable",
      label: "SBP policy rate (.csv)",
      shortLabel: "SBP Policy Rate — CSV",
      filename: "Pakistan_SBP_Policy_Rate_v1.csv",
      description: "SBP policy rate alone: year, fiscal year and sbp_policy_rate_pct.",
      bytes: 685,
      sha256: "cb6398886f99c30a6907667d3af0c42f0238754d3b2ad72d41539ff8bf498ffc",
    },
    {
      kind: "csv-variable",
      label: "CPI inflation (.csv)",
      shortLabel: "CPI Inflation — CSV",
      filename: "Pakistan_CPI_Inflation_v1.csv",
      description: "CPI inflation alone: year, fiscal year and cpi_inflation_pct.",
      bytes: 677,
      sha256: "249763ccf42126099ec9bd7a46475a0524cfb635929b97103be5ae735b551cfa",
    },
    {
      kind: "csv-variable",
      label: "Real policy rate (.csv)",
      shortLabel: "Real Policy Rate — CSV",
      filename: "Pakistan_Real_Policy_Rate_v1.csv",
      description: "Approximate ex-post real policy rate alone: year, fiscal year and real_policy_rate_pct.",
      bytes: 680,
      sha256: "85383695178f28db07e2dd76cd3c119c9091c420d1d87de321cb87e12df8bd6f",
    },
  ],
  notes: [
    "Annual fiscal-year observations only (a fiscal year runs 1 July to 30 June and is labelled by the year it ends: FY1995-96 is 1996). The study period is FY1995-96 to FY2024-25, 30 years; 2026 is not included. Nothing is converted to a quarterly or monthly frequency.",
    "Missing data: 119 of 120 variable-year values are present, and 29 years have all four variables. FY2019-20 M2 growth is blank: SBP revised its monetary data from 30 June 2019, so the stock formula would compare two different bases (17.31%, against SBP's own like-for-like 18.9%). No value is interpolated, extrapolated or estimated.",
    "M2 growth = ((M2 at end-June of the year − M2 at end-June of the previous year) / M2 at end-June of the previous year) × 100, from SBP's end-June stocks. FY1995-96 uses the June 1995 stock. FY2024-25 uses SBP's final stock (12.89%); the Economic Survey printed 13.7% from a provisional one.",
    "The SBP policy rate is a fiscal-year time-weighted average: each rate is weighted by the number of days it was in force, from SBP's dated table of rate changes. It is the Reverse Repo (ceiling) rate until 24 May 2015 and the SBP Policy (Target) Rate from 25 May 2015, as SBP states; FY2014-15 mixes the two, and the switch lowers the rate by 0.50 percentage points beyond the actual cut.",
    "CPI inflation is the Pakistan Bureau of Statistics fiscal-year average rate on the latest PBS base year published for each year (1990-91, 2000-01, 2007-08 or 2015-16). Index levels are never spliced. Overlapping bases differ for some years (FY2008-09: 17.03% on the 2007-08 base, 20.77% on 2000-01); the workbook lists every published alternative.",
    "The real policy rate is the policy rate minus CPI inflation: an approximate ex-post measure that is not adjusted for expected inflation and is not a market (lending or Treasury-bill) real rate.",
    "The workbook's Coverage, Validation, Policy Rate Calculation, M2 Calculation and CPI Sources sheets document every observation. The scripts and raw downloads used to build the dataset are kept internally and are not published here.",
  ],
};

export const RESEARCH_DATASETS: readonly ResearchDataset[] = [PAKISTAN_30_YEAR, PAKISTAN_M2_INTEREST_RATES];

/** Where a research file is served from. */
export function researchFileHref(dataset: ResearchDataset, file: ResearchFile): string {
  return `/research-datasets/${dataset.directory}/${file.filename}`;
}

export function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
