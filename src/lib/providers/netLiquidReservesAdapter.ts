// Net Liquid FX Reserves provider adapter — Phase 8.10B.
//
// Implements the Phase 8.1 ProviderAdapter contract for SBP's weekly
// Forex_Arch.xlsx workbook, reusing the EXISTING, already-proven parser
// (parseFxReservesSheetHistory / findReservesSheetRows in
// syncFxReservesFromSbpExcel.ts) unchanged -- this file owns only transport
// invocation, binary-vs-HTML validation, and normalization into
// NormalizedObservation. It does not reimplement sheet-location, date
// parsing, the Phase 6A footnote fix, or plausibility/chronological
// checks -- all of that stays exactly where it already lives and is
// already tested.
//
// Standalone and NOT WIRED INTO PRODUCTION until explicitly cut over: this
// adapter is not imported by fxReserves.ts or by the Economic Calendar
// sync pipeline. Nothing about the existing read path changes by this
// file's mere existence.
//
// --- Transport decision (Phase 8.10A/8.10B) ---
// www.sbp.org.pk exhibits the same Cloudflare TLS-fingerprint-based
// behavior already diagnosed and solved for easydata.sbp.org.pk (see
// sbpTransport.ts's header and the Phase 8.10A investigation): curl on
// Windows (Schannel) with a realistic browser User-Agent passes; Node's
// fetch()/undici does not, regardless of headers. This adapter therefore
// uses sbpTransportGetBinary() -- the same proven curl-subprocess
// transport EasyData already uses in production, extended (not
// duplicated) to support a binary response, since Forex_Arch.xlsx is a
// ZIP/OOXML file and decoding it through UTF-8 would corrupt it. Unlike
// EasyData, this endpoint requires no API key -- there is nothing to keep
// out of argv/logs beyond the plain public URL itself, which is still
// never echoed in any error message (see sbpTransportGetBinary's own
// security properties, unchanged from sbpTransportGet's).
//
// --- Provenance decisions (documented, not invented) ---
// release_date / source_updated_at: always null. Forex_Arch.xlsx exposes
// neither (confirmed by fxReserves.ts's own existing comment: "Forex_Arch.xlsx
// carries no release-date/source-updated-at metadata") -- never inferred
// from fetch time or HTTP headers.
// quality_status: "official" -- a factual statement (this is SBP's own
// published statistic), not a guessed per-row score.
// source_series_id: "Forex_Arch.xlsx:NET RESERVES WITH SBP" -- matches the
// EXACT existing seriesId/seriesKey convention already used in
// fxReserves.ts's buildKpi()/buildMeta(), so nothing about the source's own
// identity changes across this migration.
// source_reference: { endpoint } only -- no credential exists for this
// endpoint to leak.
//
// --- Normalization / unit decision (Phase 8.10B) ---
// Canonical value/unit are stored EXACTLY as the workbook and the existing
// parser already represent them -- USD MILLIONS, unconverted. The existing
// USD-millions-to-billions conversion for display stays exactly where it
// already lives (fxReserves.ts's buildKpi()), untouched. This adapter
// performs zero scaling, so there is no floating-point drift to introduce.
//
// --- Date semantics ---
// The workbook's week-ending date is already a genuine period-END
// observation (confirmed: SBP publishes it as the Friday/Thursday the
// reporting week concludes) -- passed straight through as
// observationPeriod, no start/end conversion needed (unlike World Bank's
// year-only dates, which needed a genuine convention decision).

import * as XLSX from "xlsx";
import type { NormalizedObservation, ProviderAdapter } from "./providerAdapter";
import { sbpTransportGetBinary } from "@/lib/data/sbpTransport";
import { FOREX_ARCH_URL, parseFxReservesSheetHistory, type FxReservesWeeklyRow } from "@/lib/economicCalendar/automation/syncFxReservesFromSbpExcel";

/**
 * Matches seriesRegistry.ts's FX_RESERVES_INDICATOR_KEY /
 * FX_RESERVES_PROVIDER_ID exactly (independently declared here, not
 * imported -- the same established pattern worldBankAdapter.ts already
 * uses relative to its own registry entries, so a provider adapter never
 * needs to import from src/lib/freshness/*).
 */
export const NET_LIQUID_RESERVES_INDICATOR_KEY = "sbp-forex-arch:netLiquidReserves";
export const NET_LIQUID_RESERVES_PROVIDER_ID = "sbp-forex-arch";
const SOURCE_SERIES_ID = "Forex_Arch.xlsx:NET RESERVES WITH SBP";

const FETCH_TIMEOUT_MS = 20_000;

// ZIP local-file-header signature ("PK\x03\x04") -- every genuine .xlsx
// (itself a ZIP container) begins with these 4 bytes. A Cloudflare HTML
// challenge page begins with "<!DO" (`<!DOCTYPE`) instead. Checked BEFORE
// handing the buffer to the xlsx library, so a block is reported as
// exactly that -- not as an opaque "corrupt zip" parse exception.
const XLSX_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function looksLikeXlsx(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).equals(XLSX_MAGIC_BYTES);
}

export function buildNetLiquidReservesSourceReference(): Record<string, unknown> {
  return { endpoint: FOREX_ARCH_URL };
}

/**
 * Fetches Forex_Arch.xlsx via the proven curl-based binary transport,
 * validates it is genuinely an XLSX (not an HTML block page) before ever
 * calling XLSX.read(), and reuses the existing, unmodified
 * parseFxReservesSheetHistory() for every sheet-location/date/plausibility
 * rule. Never retries internally -- see ProviderAdapter's own contract;
 * the orchestrator owns retry/backoff.
 */
export async function fetchNetLiquidReservesSeries(): Promise<NormalizedObservation[]> {
  const { status, body } = await sbpTransportGetBinary(FOREX_ARCH_URL, FETCH_TIMEOUT_MS);
  if (status !== 200) {
    throw new Error(`Forex_Arch.xlsx transport returned HTTP ${status}`);
  }
  if (!looksLikeXlsx(body)) {
    throw new Error(
      `Forex_Arch.xlsx response is not a genuine XLSX file (missing PK zip signature) -- likely a Cloudflare block page or an SBP-side content change. First bytes: ${body.subarray(0, 4).toString("hex")}`,
    );
  }

  const workbook = XLSX.read(body, { type: "buffer" });
  const history: FxReservesWeeklyRow[] = parseFxReservesSheetHistory(workbook);

  const sourceUpdatedAt = null; // never exposed by this source -- see file header
  const releaseDate = null; // never exposed by this source -- see file header
  const sourceReference = buildNetLiquidReservesSourceReference();

  return history.map((row) => ({
    indicatorKey: NET_LIQUID_RESERVES_INDICATOR_KEY,
    observationPeriod: row.weekEndingDate,
    value: row.netSbpReservesM, // USD millions, unconverted -- see file header
    unit: "Million USD",
    cadence: "weekly",
    provider: NET_LIQUID_RESERVES_PROVIDER_ID,
    sourceSeriesId: SOURCE_SERIES_ID,
    qualityStatus: "official",
    releaseDate,
    sourceUpdatedAt,
    sourceReference,
    methodology: null,
  }));
}

export const netLiquidReservesAdapter: ProviderAdapter = {
  providerId: NET_LIQUID_RESERVES_PROVIDER_ID,
  async fetchObservations({ indicatorKey }) {
    if (indicatorKey !== NET_LIQUID_RESERVES_INDICATOR_KEY) {
      throw new Error(`netLiquidReservesAdapter: unsupported indicatorKey "${indicatorKey}" -- this adapter serves only "${NET_LIQUID_RESERVES_INDICATOR_KEY}"`);
    }
    // sinceDate is deliberately ignored, matching worldBankAdapter.ts's own
    // documented reasoning: Forex_Arch.xlsx is one small (~90KB), full-history
    // static file with no query/range parameters to filter server-side, and
    // SBP could in principle correct an older week -- always fetching full
    // history lets the orchestrator's own diff catch that honestly, at
    // negligible bandwidth cost.
    return fetchNetLiquidReservesSeries();
  },
};
