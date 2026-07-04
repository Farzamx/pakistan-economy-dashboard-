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

interface FxReservesRow {
  weekEndingDate: string; // "YYYY-MM-DD"
  netSbpReservesBn: number; // USD billions, rounded to 2 decimal places
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

function parseFxReservesSheet(wb: XLSX.WorkBook): FxReservesRow {
  // Forex_Arch.xlsx structure (confirmed from live file, July 2026):
  //   Sheet "Week-end" contains weekly data.
  //   Row 5 (header): ["END PERIOD", "NET RESERVES WITH SBP", "NET RESERVES WITH BANKS", "TOTAL LIQUID FX RESERVES"]
  //   Data rows (6+): [Excel date serial or "DD-Mon-YY (R)", sbpMillionUsd, banksMillionUsd, totalMillionUsd]
  //   Column 0 = date, Column 1 = NET RESERVES WITH SBP (the measure we want).
  //   Values are in USD millions.

  // Priority: "Week-end" sheet, then any other sheet with "week" in name
  const orderedSheets = [
    ...wb.SheetNames.filter((n) => /week/i.test(n)),
    ...wb.SheetNames.filter((n) => !/week/i.test(n)),
  ];

  for (const sheetName of orderedSheets) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
    }) as unknown[][];

    // Find the header row: look for a row where col 0 contains "END PERIOD" or "PERIOD"
    // and col 1 contains "SBP" (case-insensitive)
    let headerIdx = -1;
    let dateCol = 0;  // always column 0 in this file
    let sbpCol = 1;   // always column 1 in this file

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

    if (headerIdx < 0) continue;

    // Scan from the bottom to find the most recent valid data row
    for (let i = rows.length - 1; i > headerIdx; i--) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const rawDate = row[dateCol];
      const rawSbp = row[sbpCol];
      if (rawDate === null || rawSbp === null) continue;
      if (typeof rawSbp !== "number" || rawSbp <= 0) continue;

      let weekEndingDate: string | null = null;
      if (typeof rawDate === "number") {
        weekEndingDate = excelSerialToDate(rawDate);
      } else if (typeof rawDate === "string") {
        // Handle "DD-Mon-YY (R)" format, e.g. "30-Jul-11 (R)"
        const m = rawDate.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
        if (m) {
          const monthMap: Record<string, string> = {
            jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
            jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
          };
          const mon = monthMap[m[2].toLowerCase()];
          const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
          if (mon) weekEndingDate = `${yr}-${mon}-${m[1].padStart(2,"0")}`;
        }
        if (!weekEndingDate) weekEndingDate = parseIsoLikeDateString(rawDate);
      }
      if (!weekEndingDate) continue;

      // Values are in USD millions — convert to billions
      const netSbpReservesBn = rawSbp / 1000;

      return { weekEndingDate, netSbpReservesBn: Math.round(netSbpReservesBn * 100) / 100 };
    }
  }

  throw new Error(
    `Forex_Arch.xlsx: could not find a sheet with an "END PERIOD" / "NET RESERVES WITH SBP" header. ` +
    `Sheet names: [${wb.SheetNames.join(", ")}]. ` +
    `SBP may have restructured the file. Check ${FOREX_ARCH_URL}.`,
  );
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
      const res = await fetch(FOREX_ARCH_URL, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`SBP Forex_Arch.xlsx fetch returned ${res.status}`);
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
      fxRow = parseFxReservesSheet(wb);
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
