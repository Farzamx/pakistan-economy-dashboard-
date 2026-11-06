// A read-only look at PBS's live CPI file, answering ONE question for the ledger-currency check: what is the newest month PBS
// is publishing right now, and when did it prepare that file? Nothing is written; nothing is ingested.
//
// The file is validated with the SAME loader the ingestion uses (loadPbsCpiDataset: all 26 series, one base period, the
// Laspeyres identity…). A file that fails is reported as such and NOT as a newer release: ingestion would reject it too, so
// it cannot make the ledger "behind" in any way a run could fix.
//
// Injected `fetchImpl` so tests never touch the network. One request, no retry (a probe that retries is an ingestion run).

import { PBS_CPI_FILE_URL, loadPbsCpiDataset } from "@/lib/providers/pbsCpiGroupsAdapter";
import type { PbsProbe } from "@/lib/cpiLedgerCurrency";

const MAX_BYTES = 2_000_000;

export async function probePbs(fetchImpl: typeof fetch = fetch, timeoutMs = 20_000): Promise<NonNullable<PbsProbe>> {
  try {
    const res = await fetchImpl(PBS_CPI_FILE_URL, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const xml = await res.text();
    if (xml.length > MAX_BYTES) return { ok: false, error: "the file is larger than expected" };
    const { dataset, report } = loadPbsCpiDataset(xml);
    if (!dataset) return { ok: false, error: `PBS answered but the file failed validation (${report.checks.filter((c) => c.status === "fail").map((c) => c.id).slice(0, 3).join(", ")})` };
    return { ok: true, latestMonth: dataset.months[dataset.months.length - 1], preparedAt: dataset.preparedAt };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
