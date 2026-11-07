// Server-side read of PBS's CPI-by-expenditure-group SDMX file, for the
// Inflation page's category analysis.
//
// WHY THIS READS THE FILE AT RENDER TIME
// The app's monthly sync (syncCpiFromPbs.ts) already downloads this same file but
// stores only the headline index; the 12 group indices and weights in it are
// not in the database, and the only category RPC returns the latest month alone.
// Persisting the history would need a new table and RPC (a schema change this
// phase may not make). So the page reads the file itself, through Next's data
// cache, and PARSES + VALIDATES it (src/lib/inflation/pbsGroups.ts) — a file that
// fails the integrity checks yields `null` and the page says category history
// is unavailable. There is no fallback to invented or interpolated values.
//
// This is a deliberate, documented exception to the "render paths read the
// ledger, not the provider" convention that Phase 6A.3 established for SBP
// EasyData (which Cloudflare blocks from servers). PBS's file is public, ~83 KB,
// and the app already fetches PBS content on render for its news feed. If PBS
// ever blocks the production host, this degrades to "unavailable" — it cannot
// break the page. The durable fix is to ingest the group series into the
// canonical ledger; that needs a migration and is left for approval.

import "server-only";
import { parseCpiGroupPanel, type CpiGroupPanel } from "@/lib/inflation/pbsGroups";

/** The same URL syncCpiFromPbs.ts uses for the headline index (a test asserts they match). */
export const PBS_CPI_SDMX_URL = "https://www.pbs.gov.pk/wp-content/uploads/2020/07/CPI.xml";

/** The file changes monthly; an hour matches the page's own revalidation. */
const REVALIDATE_SECONDS = 3600;
const FETCH_TIMEOUT_MS = 15_000;
/** The file is ~83 KB. Anything vastly larger is not the file this parser was written for. */
const MAX_BYTES = 2_000_000;

export interface CpiGroupPanelResult {
  panel: CpiGroupPanel | null;
  /** Why `panel` is null (fetch failure, or every integrity problem the parser found). Empty on success. */
  issues: string[];
}

export async function getCpiGroupPanel(fetchImpl: typeof fetch = fetch): Promise<CpiGroupPanelResult> {
  try {
    const res = await fetchImpl(PBS_CPI_SDMX_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { panel: null, issues: [`PBS CPI file request returned HTTP ${res.status}.`] };
    const xml = await res.text();
    if (xml.length > MAX_BYTES) return { panel: null, issues: ["PBS CPI file is larger than expected; not parsed."] };
    return parseCpiGroupPanel(xml);
  } catch (err) {
    return { panel: null, issues: [`PBS CPI file could not be retrieved: ${err instanceof Error ? err.message : String(err)}`] };
  }
}
