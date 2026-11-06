// Dataset categories — client-safe.
//
// Split out of datasetRegistry.ts so client components can import the
// category list without dragging in the registry's server-only dependency
// chain (datasetRegistry -> sbp.ts -> sbpTransport -> node:child_process),
// which Turbopack cannot bundle for the browser.
//
// datasetRegistry.ts re-exports these, so there is still one definition.

export type DatasetCategory = "Prices" | "Money & rates" | "External sector" | "Fiscal" | "Real economy" | "Global";

export const DATASET_CATEGORIES: DatasetCategory[] = [
  "Prices",
  "Money & rates",
  "External sector",
  "Fiscal",
  "Real economy",
  "Global",
];
