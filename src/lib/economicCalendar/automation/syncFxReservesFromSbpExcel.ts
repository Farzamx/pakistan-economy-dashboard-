import * as XLSX from "xlsx";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { validateObservationPeriod } from "@/lib/economicCalendar/observationPeriodValidator";
import { SERIES_PUBLICATION_META } from "@/lib/economicCalendar/seriesPublicationConfig";
import { recordSourceAttempt } from "@/lib/economicCalendar/sourceHealthTracker";
import type { SyncResult, SyncProvenance } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";

// SBP FX Reserves Sync — Phase 7 Step 3
//
// SBP publishes weekly net liquid FX reserves (excluding SDR allocations and
// swap lines) in Forex_Arch.xlsx at a stable, unauthenticated direct URL:
//   https://www.sbp.org.pk/assets/document/Forex_Arch.xlsx
//
// This file is updated weekly (Thursdays/Fridays) for the week-ending date,
// and is ~85KB — parseable with the same xlsx library used for SPI and GDP.
//
// The SBP EasyData series Z00020 reports Monthly Total Reserves (~$17B),
// which is the wrong measure for the weekly net-liquid slots in the calendar.
// Forex_Arch.xlsx provides the correct weekly net SBP reserves (~$11B).
//
// Sheet structure (as of July 2026):
//   The file has a sheet named "Archive" (or similar). Columns include:
//   - A date column (week-ending dates, Excel serial or string format)
//   - "SBP" or "Net SBP Reserves" column (the net liquid figure in USD millions
//     or USD billions — see parseFxReservesSheet() for normalization)
//
// The parser is defensive: it scans each sheet for a header row containing
// "SBP" and a recognisable date column, then reads the most recent data row.
// If the sheet layout changes, the parse throws a descriptive error that lands
// in cron_run_log rather than silently writing wrong data.
//
// Security: writes via sync_event_actual() SECURITY DEFINER RPC, gated by
// NOTIFICATION_WORKER_SECRET (migration 0027).

const FOREX_ARCH_URL = "https://www.sbp.org.pk/assets/document/Forex_Arch.xlsx";
const FETCH_TIMEOUT_MS = 20_000;
const SERIES_SLUG = "sbp-foreign-exchange-reserves";

export interface FxReservesRow {
  weekEndingDate: string; // "YYYY-MM-DD"
  netSbpReservesBn: number; // USD billions, rounded to 2 decimal places
}

/** Full-history variant of FxReservesRow — same net-SBP figure plus the two
 * other columns the same sheet already provides, so the dashboard's "Total
 * Liquid Reserves" stat can be computed from Forex_Arch's own Total column
 * instead of summing two series of different frequencies. */
export interface FxReservesWeeklyRow {
  weekEndingDate: string; // "YYYY-MM-DD"
  netSbpReservesM: number; // USD millions (unrounded — rounding is a display concern)
  netBankReservesM: number;
  totalLiquidReservesM: number;
}

function excelSerialToDate(serial: number): string {
  // Excel date serial: days since 1900-01-01 (with the 1900 leap-year bug)
  const msPerDay = 86_400_000;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30)).getTime();
  const date = new Date(excelEpoch + serial * msPerDay);
  return date.toISOString().slice(0, 10);
}

function parseIsoLikeDateString(s: string): string | null {
  // Handles "DD-MM-YYYY", "YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"
  const clean = s.trim();
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  // DD-MM-YYYY or DD/MM/YYYY (Pakistan convention)
  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/**
 * Confirmed live bug (Phase 6A hotfix): SBP appends a footnote reference
 * number directly onto some rows' "DD-Mon-YY" cells with NO separator —
 * e.g. "20-Apr-2316/" is actually 20 Apr '23 plus footnote "16/", and
 * "29-Oct-2010/" is actually 29 Oct '20 plus footnote "10/" (the second
 * example is the dangerous one: "2010" LOOKS like a plausible year, so a
 * simple year-range sanity check alone would not have caught it — only
 * constraining the year capture to exactly 2 digits, which is what SBP's
 * own format always uses in this branch, fixes it at the source). The
 * previous regex's `(\d{2,4})` greedily swallowed those footnote digits
 * into the year. Verified against every one of the 104 string-formatted
 * date cells in the live file: this exact-2-digit constraint reproduces
 * the correct date for all of them, including the ones with a genuine
 * space before a footnote/revision marker (unaffected either way) and the
 * concatenated-footnote ones (now correct instead of corrupted). Month is
 * `{3,9}` (not a fixed 3) to also catch "3-June-195/" (the sheet's one
 * full-length month spelling), sliced to 3 chars for the lookup.
 */
function parseDateCell(rawDate: unknown): string | null {
  if (typeof rawDate === "number") return excelSerialToDate(rawDate);
  if (typeof rawDate !== "string") return null;
  const m = rawDate.match(/(\d{1,2})-([A-Za-z]{3,9})-(\d{2})/);
  if (m) {
    const monthMap: Record<string, string> = {
      jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
      jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
    };
    const mon = monthMap[m[2].slice(0, 3).toLowerCase()];
    if (mon) return `20${m[3]}-${mon}-${m[1].padStart(2,"0")}`;
  }
  return parseIsoLikeDateString(rawDate);
}

// Sanity bounds for a single observation (Phase 6A hotfix) — a parsed row
// failing any of these is corrupted-looking, not just "unusual," and must
// never reach a cache or a chart. Reserve figures are in USD millions.
// Range is deliberately generous (Pakistan's actual net liquid SBP reserves
// have ranged roughly $3B-$18.5B across this file's full 2011-2026 history)
// so it only rejects genuine corruption (wrong scale, wrong decade), never
// a real but unusually low/high week.
const MIN_PLAUSIBLE_RESERVES_M = 500; // $0.5B
const MAX_PLAUSIBLE_RESERVES_M = 100_000; // $100B
const EARLIEST_PLAUSIBLE_DATE = "2000-01-01";

function isPlausibleObservation(row: FxReservesWeeklyRow): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.weekEndingDate)) return false;
  if (row.weekEndingDate < EARLIEST_PLAUSIBLE_DATE) return false;
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (row.weekEndingDate > tomorrow) return false;
  if (!Number.isFinite(row.netSbpReservesM) || row.netSbpReservesM < MIN_PLAUSIBLE_RESERVES_M || row.netSbpReservesM > MAX_PLAUSIBLE_RESERVES_M) return false;
  if (!Number.isFinite(row.netBankReservesM) || row.netBankReservesM < 0 || row.netBankReservesM > MAX_PLAUSIBLE_RESERVES_M) return false;
  if (!Number.isFinite(row.totalLiquidReservesM) || row.totalLiquidReservesM < 0 || row.totalLiquidReservesM > MAX_PLAUSIBLE_RESERVES_M * 2) return false;
  return true;
}

/**
 * Locates the "Week-end" sheet + its header row, shared by both the
 * latest-row parser (the sync pipeline's own need) and the full-history
 * parser (the dashboard's weekly Net Liquid Reserves KPI/chart) — exactly
 * one place that knows this file's layout, matching this module's own
 * documented principle (see fetchFxReservesRowFresh's docstring) rather than
 * two implementations that could silently diverge on a future layout change.
 */
function findReservesSheetRows(wb: XLSX.WorkBook): { rows: unknown[][]; headerIdx: number } | null {
  // Forex_Arch.xlsx structure (confirmed from live file, July 2026):
  //   Sheet "Week-end" contains weekly data.
  //   Row 5 (header): ["END PERIOD", "NET RESERVES WITH SBP", "NET RESERVES WITH BANKS", "TOTAL LIQUID FX RESERVES"]
  //   Data rows (6+): [Excel date serial or "DD-Mon-YY (R)", sbpMillionUsd, banksMillionUsd, totalMillionUsd]
  //   Values are in USD millions.
  const orderedSheets = [
    ...wb.SheetNames.filter((n) => /week/i.test(n)),
    ...wb.SheetNames.filter((n) => !/week/i.test(n)),
  ];

  for (const sheetName of orderedSheets) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null }) as unknown[][];

    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const c0 = typeof row[0] === "string" ? row[0].toUpperCase() : "";
      const c1 = typeof row[1] === "string" ? row[1].toUpperCase() : "";
      if (c0.includes("PERIOD") && c1.includes("SBP")) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx >= 0) return { rows, headerIdx };
  }
  return null;
}

function parseFxReservesSheet(wb: XLSX.WorkBook): FxReservesRow {
  const located = findReservesSheetRows(wb);
  if (!located) {
    throw new Error(
      `Forex_Arch.xlsx: could not find a sheet with an "END PERIOD" / "NET RESERVES WITH SBP" header. ` +
      `Sheet names: [${wb.SheetNames.join(", ")}]. ` +
      `SBP may have restructured the file. Check ${FOREX_ARCH_URL}.`,
    );
  }
  const { rows, headerIdx } = located;

  // Scan from the bottom to find the most recent VALID (not just parseable)
  // data row — a row whose date/value parse successfully but fail the
  // plausibility bounds (isPlausibleObservation) is treated exactly like an
  // unparseable one: skip and keep scanning upward, never return it.
  for (let i = rows.length - 1; i > headerIdx; i--) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const rawSbp = row[1];
    if (row[0] === null || rawSbp === null || typeof rawSbp !== "number" || rawSbp <= 0) continue;

    const weekEndingDate = parseDateCell(row[0]);
    if (!weekEndingDate) continue;

    const rawBanks = row[2];
    const rawTotal = row[3];
    const candidate: FxReservesWeeklyRow = {
      weekEndingDate,
      netSbpReservesM: rawSbp,
      netBankReservesM: typeof rawBanks === "number" ? rawBanks : 0,
      totalLiquidReservesM: typeof rawTotal === "number" ? rawTotal : rawSbp + (typeof rawBanks === "number" ? rawBanks : 0),
    };
    if (!isPlausibleObservation(candidate)) continue;

    // Values are in USD millions — convert to billions
    const netSbpReservesBn = rawSbp / 1000;
    return { weekEndingDate, netSbpReservesBn: Math.round(netSbpReservesBn * 100) / 100 };
  }

  throw new Error(
    `Forex_Arch.xlsx: header row found but no valid, plausible numeric data row beneath it. ` +
    `SBP may have restructured the file. Check ${FOREX_ARCH_URL}.`,
  );
}

/**
 * Full weekly history (oldest -> newest), all three columns — backs the
 * dashboard's Net Liquid Reserves KPI/chart (src/lib/data/fxReserves.ts).
 * Skips footnote/annotation rows the same way the latest-row parser does
 * (requires a numeric, positive SBP value and a parseable date), so the
 * trailing "17/: 28July2023 being public holiday"-style notes below the
 * real data are naturally excluded rather than needing a separate cutoff.
 */
export function parseFxReservesSheetHistory(wb: XLSX.WorkBook): FxReservesWeeklyRow[] {
  const located = findReservesSheetRows(wb);
  if (!located) {
    throw new Error(
      `Forex_Arch.xlsx: could not find a sheet with an "END PERIOD" / "NET RESERVES WITH SBP" header. ` +
      `Sheet names: [${wb.SheetNames.join(", ")}]. ` +
      `SBP may have restructured the file. Check ${FOREX_ARCH_URL}.`,
    );
  }
  const { rows, headerIdx } = located;

  const history: FxReservesWeeklyRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const rawSbp = row[1];
    if (row[0] === null || rawSbp === null || typeof rawSbp !== "number" || rawSbp <= 0) continue;

    const weekEndingDate = parseDateCell(row[0]);
    if (!weekEndingDate) continue;

    const rawBanks = row[2];
    const rawTotal = row[3];
    const candidate: FxReservesWeeklyRow = {
      weekEndingDate,
      netSbpReservesM: rawSbp,
      netBankReservesM: typeof rawBanks === "number" ? rawBanks : 0,
      totalLiquidReservesM: typeof rawTotal === "number" ? rawTotal : rawSbp + (typeof rawBanks === "number" ? rawBanks : 0),
    };
    // Reject corrupted-looking rows outright rather than accepting them —
    // this is what actually catches the footnote-concatenation bug's class
    // of error (a wrong-but-plausible-looking date is still rejected if the
    // date/value combination is implausible; the regex fix above is what
    // makes them parse correctly in the first place, this is the backstop).
    if (!isPlausibleObservation(candidate)) continue;
    history.push(candidate);
  }

  if (history.length === 0) {
    throw new Error(`Forex_Arch.xlsx: header row found but no valid, plausible numeric data rows beneath it. Check ${FOREX_ARCH_URL}.`);
  }

  // Sheet rows are already chronological ascending (confirmed from the live
  // file), but sort defensively — a future SBP re-export in a different row
  // order should never silently produce an out-of-order (and therefore
  // wrong previous/latest and mis-drawn chart) trend.
  history.sort((a, b) => a.weekEndingDate.localeCompare(b.weekEndingDate));

  // Chronological-consistency backstop: real weekly observations are ~7
  // days apart. A row that's <=0 days after (duplicate/regressed) or wildly
  // far ahead (>45 days — several missed weeks' worth) of its predecessor
  // is still corrupted-looking even after passing the per-row plausibility
  // check above, so drop it rather than let one bad row distort the trend.
  const chronological: FxReservesWeeklyRow[] = [];
  for (const row of history) {
    const prev = chronological[chronological.length - 1];
    if (prev) {
      const gapDays = (new Date(row.weekEndingDate).getTime() - new Date(prev.weekEndingDate).getTime()) / 86_400_000;
      if (gapDays <= 0 || gapDays > 45) continue;
    }
    chronological.push(row);
  }

  if (chronological.length === 0) {
    throw new Error(`Forex_Arch.xlsx: no chronologically-consistent data rows found. Check ${FOREX_ARCH_URL}.`);
  }
  return chronological;
}

/**
 * Fetches and parses Forex_Arch.xlsx with no DB read/write — the shared fetch
 * step used by both the sync path below and postReleaseVerification.ts's
 * re-check (production-hardening audit, 2026-07-18), so there is exactly one
 * implementation of "download and parse the live SBP file" rather than two
 * that could silently diverge. Throws on fetch/parse failure — callers decide
 * how to record/report that.
 */
/**
 * revalidateSeconds=null means cache:"no-store" (always-fresh — what the
 * sync pipeline and postReleaseVerification.ts need, unchanged from before).
 * A number means a cacheable, ISR-compatible fetch instead — required for
 * fxReserves.ts's dashboard read path: a page whose render calls a
 * cache:"no-store" fetch is forced fully dynamic by Next.js (confirmed via
 * a real build — /foreign-exchange-reserves-pakistan dropped out of static
 * generation the moment this module's fetch was reused there), which would
 * also have put the homepage's build-time render at risk of the exact
 * "Vercel deploy corruption" class of bug next.config.ts's
 * staticPageGenerationTimeout comment documents for a different fetch.
 */
async function downloadForexArch(revalidateSeconds: number | null): Promise<XLSX.WorkBook> {
  const cacheOptions: RequestInit = revalidateSeconds === null ? { cache: "no-store" } : { next: { revalidate: revalidateSeconds } };
  const res = await fetch(FOREX_ARCH_URL, { ...cacheOptions, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`SBP Forex_Arch.xlsx fetch returned ${res.status}`);
  const buf = await res.arrayBuffer();
  return XLSX.read(new Uint8Array(buf), { type: "array" });
}

export async function fetchFxReservesRowFresh(): Promise<FxReservesRow> {
  return parseFxReservesSheet(await downloadForexArch(null));
}

/** Full weekly history — the dashboard's Net Liquid Reserves KPI/chart (src/lib/data/fxReserves.ts) calls this, not fetchFxReservesRowFresh(), so it gets a real trend rather than a single point. Same download step, same file, same parser family — see findReservesSheetRows(). `revalidateSeconds` defaults to null (always-fresh) for any other caller; fxReserves.ts passes its own ISR window explicitly. */
export async function fetchFxReservesHistoryFresh(revalidateSeconds: number | null = null): Promise<FxReservesWeeklyRow[]> {
  return parseFxReservesSheetHistory(await downloadForexArch(revalidateSeconds));
}

/**
 * Syncs SBP weekly net FX reserves from Forex_Arch.xlsx (primary source).
 * Matches the observation week-ending date to the due scheduled event.
 */
export async function syncFxReservesFromSbpExcel(): Promise<SyncResult> {
  const fetchStart = new Date();
  const entryMs = fetchStart.getTime();
  try {
    const pubMeta = SERIES_PUBLICATION_META[SERIES_SLUG];
    if (!pubMeta?.periodValidation) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "skipped-not-configured",
        detail: `No period-validation config for ${SERIES_SLUG}. Check seriesPublicationConfig.ts.`,
        durationMs: Date.now() - entryMs,
      };
    }

    // Download Forex_Arch.xlsx
    let fxRow: FxReservesRow;
    try {
      fxRow = await fetchFxReservesRowFresh();
    } catch (fetchErr) {
      void recordSourceAttempt(
        {
          success: false,
          sourceName: "SBP Forex_Arch.xlsx (weekly reserves)",
          sourceType: "official-csv",
          isFallback: false,
          error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        },
        SERIES_SLUG,
        fetchStart,
        "fx-reserves-sync",
      );
      return {
        seriesSlug: SERIES_SLUG,
        status: "error",
        detail: `Forex_Arch.xlsx fetch/parse failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
        durationMs: Date.now() - entryMs,
      };
    }

    void recordSourceAttempt(
      {
        success: true,
        observationDate: fxRow.weekEndingDate,
        sourceName: "SBP Forex_Arch.xlsx (weekly reserves)",
        sourceType: "official-csv",
        isFallback: false,
      },
      SERIES_SLUG,
      fetchStart,
      "fx-reserves-sync",
    );

    // Find the due event (weekly, exact date match via period validator)
    const supabase = createPublicDataClient();
    const workerSecret = process.env.NOTIFICATION_WORKER_SECRET ?? "";
    const today = new Date().toISOString().slice(0, 10);
    const { data: dueEvents } = await supabase
      .from("economic_events")
      .select("event_date, economic_event_series!inner(slug)")
      .eq("economic_event_series.slug", SERIES_SLUG)
      .eq("status", "scheduled")
      .lte("event_date", today)
      .order("event_date", { ascending: false })
      .limit(1);

    const dueEvent = dueEvents?.[0];
    if (!dueEvent) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "skipped-no-due-event",
        detail: `No scheduled FX reserves event is due yet (today=${today}, Forex_Arch obs=${fxRow.weekEndingDate}).`,
        durationMs: Date.now() - entryMs,
        observationPeriod: fxRow.weekEndingDate,
      };
    }

    // FX reserves: as-needed with ±7 days. Forex_Arch uses Friday week-ending
    // dates; events are seeded on Thursday press-release days — exact match
    // always failed. maxDaysVariance=7 covers the 1-day structural gap and
    // one missed-week edge case without risking cross-week period confusion.
    const periodCheck = validateObservationPeriod(
      fxRow.weekEndingDate,
      dueEvent.event_date,
      pubMeta.periodValidation,
    );
    if (!periodCheck.valid) {
      return {
        seriesSlug: SERIES_SLUG,
        status: "skipped-period-mismatch",
        detail:
          `${periodCheck.reason} ` +
          `(Forex_Arch obs=${fxRow.weekEndingDate}, event=${dueEvent.event_date})`,
        durationMs: Date.now() - entryMs,
        observationPeriod: fxRow.weekEndingDate,
        dueEventDate: dueEvent.event_date,
      };
    }

    // Format: "$11.0B" matching existing confirmed event format
    const actualValue = `$${fxRow.netSbpReservesBn.toFixed(1)}B`;

    const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
      p_internal_secret: workerSecret,
      p_series_slug: SERIES_SLUG,
      p_event_date: dueEvent.event_date,
      p_actual_value: actualValue,
      p_observation_date: fxRow.weekEndingDate,
    });

    if (error) {
      return { seriesSlug: SERIES_SLUG, status: "error", detail: error.message, durationMs: Date.now() - entryMs };
    }

    const provenance: SyncProvenance = {
      sourceName: "SBP Forex_Arch.xlsx (weekly net SBP reserves)",
      sourceType: "official-csv",
      observationPeriod: periodCheck.expectedPeriod ?? fxRow.weekEndingDate,
      observationDate: fxRow.weekEndingDate,
      syncTimestamp: new Date().toISOString(),
      dataConfidence: "confirmed",
    };

    let nextEventDate: string | undefined;
    if (didUpdate) {
      const { data: nextEvt } = await supabase
        .from("economic_events")
        .select("event_date, economic_event_series!inner(slug)")
        .eq("economic_event_series.slug", SERIES_SLUG)
        .eq("status", "scheduled")
        .gt("event_date", dueEvent.event_date)
        .order("event_date", { ascending: true })
        .limit(1);
      nextEventDate = (nextEvt?.[0] as { event_date?: string } | undefined)?.event_date;
    }

    return didUpdate
      ? {
          seriesSlug: SERIES_SLUG,
          status: "synced",
          detail: `reserves=${actualValue} | weekEnding=${fxRow.weekEndingDate} | event=${dueEvent.event_date}`,
          provenance,
          durationMs: Date.now() - entryMs,
          observationPeriod: fxRow.weekEndingDate,
          dueEventDate: dueEvent.event_date,
          nextEventDate,
        }
      : {
          seriesSlug: SERIES_SLUG,
          status: "skipped-no-due-event",
          detail: "FX reserves event already released or not found at call time.",
          durationMs: Date.now() - entryMs,
          dueEventDate: dueEvent.event_date,
        };
  } catch (err) {
    return {
      seriesSlug: SERIES_SLUG,
      status: "error",
      detail: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - entryMs,
    };
  }
}
