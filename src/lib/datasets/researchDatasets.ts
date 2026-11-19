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

export type ResearchFileKind = "xlsx" | "csv" | "pdf" | "sps" | "csv-derived";

export interface ResearchFile {
  kind: ResearchFileKind;
  /** Button text. */
  label: string;
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
  sources: readonly string[];
  files: readonly ResearchFile[];
  /** Plain statements a reader needs before using the data. */
  notes: readonly string[];
}

export const PAKISTAN_30_YEAR: ResearchDataset = {
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
  variables: 64,
  observations: 30,
  derivedVariables: 22,
  sources: ["World Bank", "IMF", "Ministry of Finance", "State Bank of Pakistan"],
  files: [
    {
      kind: "xlsx",
      label: "Excel workbook (.xlsx)",
      filename: "Pakistan_Macroeconomic_Data_30_Years.xlsx",
      description: "Master dataset, data dictionary, sources, data-quality report and derived variables.",
      bytes: 72242,
      sha256: "3371e3559fd6d99534a2aeb217999e3d6a5a16d1107614da4710aa64f073c6f7",
    },
    {
      kind: "csv",
      label: "CSV dataset (.csv)",
      filename: "Pakistan_Macroeconomic_Data_30_Years.csv",
      description: "The master dataset for statistical software: one row per fiscal year, blank cells where the source publishes nothing.",
      bytes: 17650,
      sha256: "58878d0de3b180da517e8bf997b4d9424f8c2f3fcdc7022b2b22c049bdde17c3",
    },
    {
      kind: "pdf",
      label: "Codebook (.pdf)",
      filename: "Pakistan_Macroeconomic_Data_Codebook.pdf",
      description: "Every variable, its unit, period basis, coverage and source, plus the dataset's limitations.",
      bytes: 26580,
      sha256: "38db1f12ed915ee264aeb62e47dda4b5a777ae1d5bf5e21dc363753e41674e71",
    },
    {
      kind: "sps",
      label: "SPSS import syntax (.sps)",
      filename: "Pakistan_Macroeconomic_Data_Import.sps",
      description: "Reads the CSV into IBM SPSS Statistics with every variable labelled. Edit the folder in its FILE line first.",
      bytes: 16348,
      sha256: "1efc71335cf8a71fd2d47cce7d23987c66c7fdd2acbbe1bbfd4bf6c8fc9c797e",
    },
    {
      kind: "csv-derived",
      label: "Derived variables (.csv)",
      filename: "Pakistan_Macroeconomic_Data_30_Years_Derived.csv",
      description: "Optional. Annual changes, ratios and fiscal-year exchange rates calculated from the master data, each with its formula in the workbook.",
      bytes: 5709,
      sha256: "b68a8c6dfcf50db3a17ef4117ae05e5acf2f82b873f570b2aa205480b201f18e",
      optional: true,
    },
  ],
  notes: [
    "Annual fiscal-year observations only (a fiscal year runs 1 July to 30 June and is labelled by the year it ends). It is not offered quarterly or monthly, and no observation has been converted, interpolated or repeated.",
    "A blank cell means the source does not publish that observation; it is never zero. Variable names say whether a series is fiscal-year (_fy_) or calendar-year (_cy_): do not mix the two in one model without aligning them.",
    "Where sources disagree both versions are kept in separate columns, and known series breaks are flagged. Read the codebook before analysing the data.",
    "The workbook's Sources sheet and the codebook cite the scripts and raw downloads used to build the dataset. Those are kept internally and are not published here.",
  ],
};

export const RESEARCH_DATASETS: readonly ResearchDataset[] = [PAKISTAN_30_YEAR];

/** Where a research file is served from. */
export function researchFileHref(dataset: ResearchDataset, file: ResearchFile): string {
  return `/research-datasets/${dataset.directory}/${file.filename}`;
}

export function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
