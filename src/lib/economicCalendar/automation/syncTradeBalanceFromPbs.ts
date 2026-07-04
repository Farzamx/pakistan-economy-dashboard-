import * as XLSX from "xlsx";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { validateObservationPeriod } from "@/lib/economicCalendar/observationPeriodValidator";
import { SERIES_PUBLICATION_META } from "@/lib/economicCalendar/seriesPublicationConfig";
import { recordSourceAttempt } from "@/lib/economicCalendar/sourceHealthTracker";
import type { SyncResult, SyncProvenance } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";
import { invalidate } from "@/lib/memoryCache";

// PBS Trade Balance Sync — Phase 7 Step 4
//
// PBS publishes "Advance Releases on Foreign Trade Statistics" monthly,
// approximately on the 16th–18th of M+1 — 28–30 days BEFORE SBP's BPM6
// goods balance release (~45 days after month-end). This is the correct
// source for the "trade-balance" calendar series (customs-basis, not BPM6).
//
// Methodology: PBS customs-basis (FOB exports, CIF-adjusted imports).
// This differs from SBP BPM6 (~$470M gap for March 2026: PBS=-$2.84B vs
// BPM6=-$2.37B). The calendar series is labeled "Pakistan Bureau of Statistics"
// and must use PBS values to avoid source attribution errors.
//
// Discovery: PBS WordPress REST API at pbs.gov.pk/wp-json/wp/v2/posts,
// search for "Advance releases on Foreign Trade Statistics" (same WordPress
// site as SPI). The post body links an Excel file: Revised_Summary_<Month Year>.xlsx.
//
// Excel structure (confirmed July 2026):
//   The summary sheet contains a table with rows for:
//     - Exports (FOB), USD millions
//     - Imports (CIF), USD millions
//     - Trade Balance (= Exports - Imports), USD millions
//   Observation period: the post title or content identifies the month/year.
//
// Period validation (lagMonths=1): the M+1 release date means a July 17 event
// expects June trade data (obsDate = 2026-06-30). If PBS only has May data
// (obsDate = 2026-05-31), the validator rejects it — correct behaviour.
//
// Security: writes via sync_event_actual() SECURITY DEFINER RPC, gated by
// NOTIFICATION_WORKER_SECRET (migration 0027).

const PBS_API_BASE = "https://www.pbs.gov.pk/wp-json/wp/v2/posts";
const FETCH_TIMEOUT_MS = 20_000;
const SERIES_SLUG = "trade-balance";

// Month name → number mapping for parsing PBS trade release titles
const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

interface TradeRelease {
  exportsMillionUsd: number;
  importsMillionUsd: number;
  tradeBalanceMillionUsd: number; // negative = deficit
  obsMonth: number; // 1-12
  obsYear: number;
  obsDate: string;  // "YYYY-MM-DD" (last day of obs month)
  excelUrl: string;
}

async function discoverTradeReleasePost(): Promise<{
  title: string;
  content: string;
  date: string;
}> {
  const params = new URLSearchParams({
    search: "Advance releases on Foreign Trade",
    per_page: "3",
    orderby: "date",
    order: "desc",
  });
  const res = await fetch(`${PBS_API_BASE}?${params.toString()}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PBS WordPress API returned ${res.status}`);
  const posts = (await res.json()) as Array<{
    title: { rendered: string };
    content: { rendered: string };
    date: string;
  }>;
  const post = posts.find((p) => /foreign.trade|advance.release/i.test(p.title.rendered));
  if (!post) {
    // Wider fallback search
    const params2 = new URLSearchParams({
      search: "Foreign Trade Statistics",
      per_page: "3",
      orderby: "date",
      order: "desc",
    });
    const res2 = await fetch(`${PBS_API_BASE}?${params2.toString()}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res2.ok) throw new Error(`PBS WordPress fallback search returned ${res2.status}`);
    const posts2 = (await res2.json()) as typeof posts;
    const post2 = posts2.find((p) => /foreign.trade|advance.release/i.test(p.title.rendered));
    if (!post2) throw new Error("No PBS advance trade release post found in WordPress API");
    return { title: post2.title.rendered, content: post2.content.rendered, date: post2.date };
  }
  return { title: post.title.rendered, content: post.content.rendered, date: post.date };
}

function parseObsPeriodFromTitle(title: string): { obsMonth: number; obsYear: number } | null {
  // Matches "July 2026", "June-2026", etc. in post title
  const m = title.match(/([A-Za-z]+)\s*[-,]?\s*(\d{4})/);
  if (!m) return null;
  const monthNum = MONTH_NAMES[m[1].toLowerCase()];
  if (!monthNum) return null;
  return { obsMonth: monthNum, obsYear: parseInt(m[2], 10) };
}

function parseTradeExcelSheet(buf: ArrayBuffer): {
  exportsMillionUsd: number;
  importsMillionUsd: number;
  tradeBalanceMillionUsd: number;
} {
  // PBS Revised_Summary Excel structure (confirmed from live file, July 2026):
  //   Row ~13: series header row — col 0 = "Series", col 1 = "Current Month (R)", col 3 = "Prior Month"
  //   Row ~15: units row — col 0 = null, col 1 = "Rs.", col 2 = "$", col 3 = "Rs.", col 4 = "$", ...
  //   Row ~16: "Exports"       → col 2 = current month USD (e.g. 2690 = $2,690M)
  //   Row ~17: "Imports"       → col 2 = current month USD (e.g. 5475 = $5,475M)
  //   Row ~18: "Balance of Trade (Trade Deficit)" → col 2 = current month USD (e.g. -2785 = -$2,785M)
  //
  // CRITICAL: The later columns (5, 6, ...) contain % change figures, not absolute values.
  // Using the LAST numeric value in a row would read % change instead of the USD balance.
  // We must find the "$" column in the units row and use that column index.

  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
    }) as unknown[][];

    // Step 1: Find the units row (the row that has "Rs." and "$" alternating).
    // The FIRST "$" in that row is the current-period USD column.
    let usdColIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      // A units row has "$" somewhere and "Rs." somewhere before it
      const hasRs = row.some((c) => typeof c === "string" && c.trim() === "Rs.");
      const dollarIdx = row.findIndex((c) => typeof c === "string" && c.trim() === "$");
      if (hasRs && dollarIdx >= 0) {
        usdColIndex = dollarIdx;
        break;
      }
    }

    if (usdColIndex < 0) continue; // not found in this sheet

    // Step 2: Find Exports, Imports, Balance rows using the discovered USD column
    let exports: number | null = null;
    let imports: number | null = null;
    let balance: number | null = null;

    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const label = row[0];
      if (typeof label !== "string") continue;
      const labelLower = label.toLowerCase().trim();

      const val = row[usdColIndex];
      if (typeof val !== "number") continue;

      if (/^exports?$/i.test(labelLower.split(/\s/)[0]!)) exports = val;
      else if (/^imports?$/i.test(labelLower.split(/\s/)[0]!)) imports = val;
      else if (/balance.of.trade|trade.deficit/i.test(labelLower)) balance = val;

      // Stop at first complete set — the sheet has multiple tables (MoM, YoY, Cumulative);
      // Table-1 (monthly) appears first and its values must not be overwritten by cumulative rows.
      if (exports !== null && imports !== null && balance !== null) break;
    }

    if (exports !== null && imports !== null && balance === null) {
      balance = exports - imports;
    }

    if (exports !== null && imports !== null && balance !== null) {
      // Values confirmed to be in USD millions (e.g. 2690 = $2,690M = $2.69B).
      // No magnitude normalisation needed — the units row "$" column gives millions directly.
      return {
        exportsMillionUsd: exports,
        importsMillionUsd: imports,
        tradeBalanceMillionUsd: balance,
      };
    }
  }

  throw new Error(
    `Trade balance Excel: could not find Exports/Imports/Balance rows or the "$" units column. ` +
    `Sheets: [${wb.SheetNames.join(", ")}]. ` +
    `PBS may have changed the summary Excel layout.`,
  );
}

async function fetchTradeRelease(): Promise<TradeRelease> {
  const post = await discoverTradeReleasePost();

  // Extract .xlsx URL from post HTML content
  const hrefs = [...post.content.matchAll(/href="([^"]+\.xlsx[^"]*)"/gi)].map((m) => m[1]);
  // Prefer "Revised_Summary" or "Summary" files over annexes
  const excelUrl =
    hrefs.find((h) => /revised.summary|summary/i.test(h)) ??
    hrefs.find((h) => /trade|fts/i.test(h)) ??
    hrefs[0];
  if (!excelUrl) {
    throw new Error(
      `PBS trade release post has no linked .xlsx file. ` +
      `Post title: "${post.title}". Content length: ${post.content.length}`,
    );
  }

  const period = parseObsPeriodFromTitle(post.title);
  if (!period) {
    throw new Error(`Could not parse observation month/year from post title: "${post.title}"`);
  }

  // Download Excel
  const xlsxRes = await fetch(excelUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!xlsxRes.ok) throw new Error(`PBS trade Excel fetch returned ${xlsxRes.status} for ${excelUrl}`);
  const buf = await xlsxRes.arrayBuffer();
  const parsed = parseTradeExcelSheet(buf);

  const lastDay = new Date(period.obsYear, period.obsMonth, 0).getDate();
  const obsDate = `${period.obsYear}-${String(period.obsMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { ...parsed, obsMonth: period.obsMonth, obsYear: period.obsYear, obsDate, excelUrl };
}

/**
 * Syncs PBS customs-basis trade balance, exports, and imports from the monthly
 * advance release Excel. All three values come from the same PBS Revised_Summary
 * Excel fetched in a single HTTP round-trip.
 *
 * Returns an array of up to 3 SyncResult entries (trade-balance, exports-release,
 * imports-release). If either exports or imports series is not yet in the DB
 * (e.g., migration 0030 not yet applied), those entries return skipped-no-due-event
 * rather than error — trade balance is never blocked on them.
 *
 * Published ~16th–18th of M+1, 28–30 days before SBP BPM6.
 */
export async function syncTradeBalanceFromPbs(): Promise<SyncResult[]> {
  const fetchStart = new Date();
  const entryMs = fetchStart.getTime();
  const results: SyncResult[] = [];

  try {
    const pubMeta = SERIES_PUBLICATION_META[SERIES_SLUG];
    if (!pubMeta?.periodValidation) {
      return [{
        seriesSlug: SERIES_SLUG,
        status: "skipped-not-configured",
        detail: `No period-validation config for ${SERIES_SLUG}. Check seriesPublicationConfig.ts.`,
        durationMs: Date.now() - entryMs,
      }];
    }

    let release: TradeRelease;
    try {
      release = await fetchTradeRelease();
    } catch (fetchErr) {
      void recordSourceAttempt(
        {
          success: false,
          sourceName: "PBS Foreign Trade Statistics (advance release Excel)",
          sourceType: "pbs-web",
          isFallback: false,
          error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        },
        SERIES_SLUG,
        fetchStart,
        "trade-balance-sync",
      );
      return [{
        seriesSlug: SERIES_SLUG,
        status: "error",
        detail: `PBS trade release fetch failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
        durationMs: Date.now() - entryMs,
      }];
    }

    void recordSourceAttempt(
      {
        success: true,
        observationDate: release.obsDate,
        sourceName: "PBS Foreign Trade Statistics (advance release Excel)",
        sourceType: "pbs-web",
        isFallback: false,
      },
      SERIES_SLUG,
      fetchStart,
      "trade-balance-sync",
    );

    console.log(
      `[trade-balance-sync] PBS fetch OK — obs=${release.obsDate} | ` +
      `exports=$${(release.exportsMillionUsd / 1000).toFixed(2)}B | ` +
      `imports=$${(release.importsMillionUsd / 1000).toFixed(2)}B | ` +
      `balance=$${(release.tradeBalanceMillionUsd / 1000).toFixed(2)}B`,
    );

    const supabase = createPublicDataClient();
    const workerSecret = process.env.NOTIFICATION_WORKER_SECRET ?? "";
    const today = new Date().toISOString().slice(0, 10);

    // ── Trade Balance ─────────────────────────────────────────────────────────

    const { data: dueEvents } = await supabase
      .from("economic_events")
      .select("event_date, economic_event_series!inner(slug)")
      .eq("economic_event_series.slug", SERIES_SLUG)
      .eq("status", "scheduled")
      .lte("event_date", today)
      .order("event_date", { ascending: false })
      .limit(1);

    const dueEvent = dueEvents?.[0];
    console.log(`[trade-balance-sync] trade-balance due event: ${dueEvent?.event_date ?? "none (event_date > " + today + ")"}`);
    if (!dueEvent) {
      results.push({
        seriesSlug: SERIES_SLUG,
        status: "skipped-no-due-event",
        detail: `No scheduled trade balance event is due yet (today=${today}, PBS obs=${release.obsDate}).`,
        durationMs: Date.now() - entryMs,
        observationPeriod: release.obsDate,
      });
    } else {
      const periodCheck = validateObservationPeriod(
        release.obsDate,
        dueEvent.event_date,
        pubMeta.periodValidation,
      );
      if (!periodCheck.valid) {
        results.push({
          seriesSlug: SERIES_SLUG,
          status: "skipped-period-mismatch",
          detail:
            `${periodCheck.reason} ` +
            `(PBS obs=${release.obsDate}, event=${dueEvent.event_date})`,
          durationMs: Date.now() - entryMs,
          observationPeriod: release.obsDate,
          dueEventDate: dueEvent.event_date,
        });
      } else {
        const balanceBn = release.tradeBalanceMillionUsd / 1000;
        const sign = balanceBn >= 0 ? "+" : "";
        const balanceValue = `${sign}$${balanceBn.toFixed(2)}B`;

        const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
          p_internal_secret: workerSecret,
          p_series_slug: SERIES_SLUG,
          p_event_date: dueEvent.event_date,
          p_actual_value: balanceValue,
          p_observation_date: release.obsDate,
        });

        if (error) {
          results.push({ seriesSlug: SERIES_SLUG, status: "error", detail: error.message, durationMs: Date.now() - entryMs });
        } else if (didUpdate) {
          invalidate(`canonical-obs:${SERIES_SLUG}`);
          let tbNextDate: string | undefined;
          const { data: tbNext } = await supabase
            .from("economic_events")
            .select("event_date, economic_event_series!inner(slug)")
            .eq("economic_event_series.slug", SERIES_SLUG)
            .eq("status", "scheduled")
            .gt("event_date", dueEvent.event_date)
            .order("event_date", { ascending: true })
            .limit(1);
          tbNextDate = (tbNext?.[0] as { event_date?: string } | undefined)?.event_date;
          results.push({
            seriesSlug: SERIES_SLUG,
            status: "synced",
            detail:
              `balance=${balanceValue} | exports=$${(release.exportsMillionUsd / 1000).toFixed(2)}B | ` +
              `imports=$${(release.importsMillionUsd / 1000).toFixed(2)}B | ` +
              `obs=${release.obsDate} | event=${dueEvent.event_date} | src=${release.excelUrl}`,
            provenance: {
              sourceName: "PBS Foreign Trade Statistics — Advance Release (customs-basis)",
              sourceType: "pbs-web",
              observationPeriod: periodCheck.expectedPeriod ?? release.obsDate,
              observationDate: release.obsDate,
              syncTimestamp: new Date().toISOString(),
              dataConfidence: "confirmed",
            } satisfies SyncProvenance,
            durationMs: Date.now() - entryMs,
            observationPeriod: periodCheck.expectedPeriod ?? release.obsDate,
            dueEventDate: dueEvent.event_date,
            nextEventDate: tbNextDate,
          });
        } else {
          results.push({
            seriesSlug: SERIES_SLUG,
            status: "skipped-no-due-event",
            detail: "Trade balance event already released or not found at call time.",
            durationMs: Date.now() - entryMs,
            dueEventDate: dueEvent.event_date,
          });
        }
      }
    }

    // ── Exports ───────────────────────────────────────────────────────────────
    // Same PBS Excel, same obsDate. Separate series and due-event lookup.

    const exportsPubMeta = SERIES_PUBLICATION_META["exports-release"];
    if (!exportsPubMeta?.periodValidation) {
      results.push({
        seriesSlug: "exports-release",
        status: "skipped-not-configured",
        detail: "No period-validation config for exports-release. Run migration 0030 and add to SERIES_PUBLICATION_META.",
      });
    } else {
      const { data: exportsDueEvents } = await supabase
        .from("economic_events")
        .select("event_date, economic_event_series!inner(slug)")
        .eq("economic_event_series.slug", "exports-release")
        .eq("status", "scheduled")
        .lte("event_date", today)
        .order("event_date", { ascending: false })
        .limit(1);

      const exportsDueEvent = exportsDueEvents?.[0];
      console.log(`[trade-balance-sync] exports-release due event: ${exportsDueEvent?.event_date ?? "none (event_date > " + today + ")"}`);
      if (!exportsDueEvent) {
        results.push({
          seriesSlug: "exports-release",
          status: "skipped-no-due-event",
          detail: `No scheduled exports event is due yet (today=${today}, PBS obs=${release.obsDate}). Run migration 0031 to seed co-dated events.`,
          durationMs: Date.now() - entryMs,
          observationPeriod: release.obsDate,
        });
      } else {
        const exportsPeriodCheck = validateObservationPeriod(
          release.obsDate,
          exportsDueEvent.event_date,
          exportsPubMeta.periodValidation,
        );
        if (!exportsPeriodCheck.valid) {
          results.push({
            seriesSlug: "exports-release",
            status: "skipped-period-mismatch",
            detail: `${exportsPeriodCheck.reason} (PBS obs=${release.obsDate}, event=${exportsDueEvent.event_date})`,
            durationMs: Date.now() - entryMs,
            observationPeriod: release.obsDate,
            dueEventDate: exportsDueEvent.event_date,
          });
        } else {
          const exportsValue = `$${(release.exportsMillionUsd / 1000).toFixed(2)}B`;
          const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
            p_internal_secret: workerSecret,
            p_series_slug: "exports-release",
            p_event_date: exportsDueEvent.event_date,
            p_actual_value: exportsValue,
            p_observation_date: release.obsDate,
          });

          if (error) {
            results.push({ seriesSlug: "exports-release", status: "error", detail: error.message, durationMs: Date.now() - entryMs });
          } else if (didUpdate) {
            invalidate("canonical-obs:exports-release");
            let exNextDate: string | undefined;
            const { data: exNext } = await supabase
              .from("economic_events")
              .select("event_date, economic_event_series!inner(slug)")
              .eq("economic_event_series.slug", "exports-release")
              .eq("status", "scheduled")
              .gt("event_date", exportsDueEvent.event_date)
              .order("event_date", { ascending: true })
              .limit(1);
            exNextDate = (exNext?.[0] as { event_date?: string } | undefined)?.event_date;
            results.push({
              seriesSlug: "exports-release",
              status: "synced",
              detail: `exports=${exportsValue} | obs=${release.obsDate} | event=${exportsDueEvent.event_date}`,
              provenance: {
                sourceName: "PBS Foreign Trade Statistics — Advance Release (customs-basis)",
                sourceType: "pbs-web",
                observationPeriod: exportsPeriodCheck.expectedPeriod ?? release.obsDate,
                observationDate: release.obsDate,
                syncTimestamp: new Date().toISOString(),
                dataConfidence: "confirmed",
              } satisfies SyncProvenance,
              durationMs: Date.now() - entryMs,
              observationPeriod: exportsPeriodCheck.expectedPeriod ?? release.obsDate,
              dueEventDate: exportsDueEvent.event_date,
              nextEventDate: exNextDate,
            });
          } else {
            results.push({
              seriesSlug: "exports-release",
              status: "skipped-no-due-event",
              detail: "Exports event already released or not found at call time.",
              durationMs: Date.now() - entryMs,
              dueEventDate: exportsDueEvent.event_date,
            });
          }
        }
      }
    }

    // ── Imports ───────────────────────────────────────────────────────────────

    const importsPubMeta = SERIES_PUBLICATION_META["imports-release"];
    if (!importsPubMeta?.periodValidation) {
      results.push({
        seriesSlug: "imports-release",
        status: "skipped-not-configured",
        detail: "No period-validation config for imports-release. Run migration 0030 and add to SERIES_PUBLICATION_META.",
      });
    } else {
      const { data: importsDueEvents } = await supabase
        .from("economic_events")
        .select("event_date, economic_event_series!inner(slug)")
        .eq("economic_event_series.slug", "imports-release")
        .eq("status", "scheduled")
        .lte("event_date", today)
        .order("event_date", { ascending: false })
        .limit(1);

      const importsDueEvent = importsDueEvents?.[0];
      console.log(`[trade-balance-sync] imports-release due event: ${importsDueEvent?.event_date ?? "none (event_date > " + today + ")"}`);
      if (!importsDueEvent) {
        results.push({
          seriesSlug: "imports-release",
          status: "skipped-no-due-event",
          detail: `No scheduled imports event is due yet (today=${today}, PBS obs=${release.obsDate}). Run migration 0031 to seed co-dated events.`,
          durationMs: Date.now() - entryMs,
          observationPeriod: release.obsDate,
        });
      } else {
        const importsPeriodCheck = validateObservationPeriod(
          release.obsDate,
          importsDueEvent.event_date,
          importsPubMeta.periodValidation,
        );
        if (!importsPeriodCheck.valid) {
          results.push({
            seriesSlug: "imports-release",
            status: "skipped-period-mismatch",
            detail: `${importsPeriodCheck.reason} (PBS obs=${release.obsDate}, event=${importsDueEvent.event_date})`,
            durationMs: Date.now() - entryMs,
            observationPeriod: release.obsDate,
            dueEventDate: importsDueEvent.event_date,
          });
        } else {
          const importsValue = `$${(release.importsMillionUsd / 1000).toFixed(2)}B`;
          const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
            p_internal_secret: workerSecret,
            p_series_slug: "imports-release",
            p_event_date: importsDueEvent.event_date,
            p_actual_value: importsValue,
            p_observation_date: release.obsDate,
          });

          if (error) {
            results.push({ seriesSlug: "imports-release", status: "error", detail: error.message, durationMs: Date.now() - entryMs });
          } else if (didUpdate) {
            invalidate("canonical-obs:imports-release");
            let imNextDate: string | undefined;
            const { data: imNext } = await supabase
              .from("economic_events")
              .select("event_date, economic_event_series!inner(slug)")
              .eq("economic_event_series.slug", "imports-release")
              .eq("status", "scheduled")
              .gt("event_date", importsDueEvent.event_date)
              .order("event_date", { ascending: true })
              .limit(1);
            imNextDate = (imNext?.[0] as { event_date?: string } | undefined)?.event_date;
            results.push({
              seriesSlug: "imports-release",
              status: "synced",
              detail: `imports=${importsValue} | obs=${release.obsDate} | event=${importsDueEvent.event_date}`,
              provenance: {
                sourceName: "PBS Foreign Trade Statistics — Advance Release (customs-basis)",
                sourceType: "pbs-web",
                observationPeriod: importsPeriodCheck.expectedPeriod ?? release.obsDate,
                observationDate: release.obsDate,
                syncTimestamp: new Date().toISOString(),
                dataConfidence: "confirmed",
              } satisfies SyncProvenance,
              durationMs: Date.now() - entryMs,
              observationPeriod: importsPeriodCheck.expectedPeriod ?? release.obsDate,
              dueEventDate: importsDueEvent.event_date,
              nextEventDate: imNextDate,
            });
          } else {
            results.push({
              seriesSlug: "imports-release",
              status: "skipped-no-due-event",
              detail: "Imports event already released or not found at call time.",
              durationMs: Date.now() - entryMs,
              dueEventDate: importsDueEvent.event_date,
            });
          }
        }
      }
    }

    return results;
  } catch (err) {
    return [...results, {
      seriesSlug: SERIES_SLUG,
      status: "error",
      detail: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - entryMs,
    }];
  }
}
