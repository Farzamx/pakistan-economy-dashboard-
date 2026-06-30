// Retrieval Method lookup (Final Production Hardening, Part 4) — one of
// the fields the Data Lineage view exposes alongside the existing Data
// Quality badge (source/date/frequency/quality state). Deliberately a
// small source-name lookup rather than a new field threaded through every
// fetcher: how a value was retrieved is a property of its SOURCE, not of
// any individual KPI, so this reuses the `source` string every Kpi already
// carries instead of duplicating metadata.

const RETRIEVAL_METHODS: Record<string, string> = {
  "SBP EasyData": "REST API (JSON)",
  "World Bank": "REST API (JSON, keyless)",
  "SBP / PBS": "Spreadsheet download (.xlsx)",
  PBS: "Spreadsheet download (.xlsx), discovered via WordPress REST API",
  "PBS Official Releases": "WordPress REST API (JSON)",
  "Yahoo Finance": "REST API (JSON, keyless)",
  FRED: "REST API (JSON)",
  "Twelve Data": "REST API (JSON)",
  "Google News RSS": "RSS/XML feed",
  "BBC / Dawn / Express Tribune RSS": "RSS/XML feed",
  "OpenRouter (free-tier models) + Groq": "Chat completions API (JSON)",
};

/** Strips a trailing "(fallback)"/"(cache)" qualifier before lookup, so e.g. "Yahoo Finance (fallback)" still resolves via the plain "Yahoo Finance" entry. */
export function getRetrievalMethod(source: string | undefined): string {
  if (!source) return "Unknown";
  const base = source.replace(/\s*\((fallback|cache)\)\s*$/i, "").trim();
  return RETRIEVAL_METHODS[base] ?? "Unknown";
}
