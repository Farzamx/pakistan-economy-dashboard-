// unpdf wraps pdfjs-dist in a serverless-safe bundle (no @napi-rs/canvas,
// no DOMMatrix at module load) — required because pdfjs-dist v5 crashes at
// import time on Vercel: `const SCALE_MATRIX = new DOMMatrix()` runs at
// module level, and Node 18 serverless has no DOMMatrix global.
import { extractText, getDocumentProxy } from "unpdf";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { validateObservationPeriod } from "@/lib/economicCalendar/observationPeriodValidator";
import { SERIES_PUBLICATION_META } from "@/lib/economicCalendar/seriesPublicationConfig";
import { recordSourceAttempt } from "@/lib/economicCalendar/sourceHealthTracker";
import type { SyncResult, SyncProvenance } from "@/lib/economicCalendar/automation/syncFromSbpEasyData";
import { invalidate } from "@/lib/memoryCache";

// PBS CPI Sync — Phase 7 Step 5
//
// PBS publishes the Monthly Inflation Report on the 1st of every month
// (or the first weekday if the 1st is a weekend) at ~14:00 PKT.
//
// The report is a PDF attachment linked from a WordPress post. The HTML text
// of the post does NOT contain the CPI values — they are in the PDF only.
// Discovery: PBS WordPress REST API search for "Monthly Inflation Report".
//
// Confirmed publication pattern (8 months of evidence):
//   May CPI (April data)  → posted 2026-05-01
//   June CPI (May data)   → posted 2026-06-01
//   July CPI (June data)  → posted 2026-07-01
// → expectedDayOfMonth = 1 (corrected from legacy value of 10).
//
// This module writes to BOTH:
//   cpi-inflation-release   — headline CPI YoY %
//   core-inflation-release  — Urban NFNE core inflation YoY %
//
// EasyData in syncFromSbpEasyData.ts is the fallback: if PBS PDF is parsed
// first and writes the events, EasyData's sync_event_actual calls return false
// (idempotent — event already released) and are skipped cleanly.
//
// Security: writes via sync_event_actual() SECURITY DEFINER RPC, gated by
// NOTIFICATION_WORKER_SECRET (migration 0027).

const PBS_API_BASE = "https://www.pbs.gov.pk/wp-json/wp/v2/posts";
const FETCH_TIMEOUT_MS = 25_000;

const CPI_SERIES_SLUG = "cpi-inflation-release";
const CORE_SERIES_SLUG = "core-inflation-release";

interface CpiPbsResult {
  cpiYoYPct: number;
  coreYoYPct: number | null; // null if NFNE not found in the PDF
  obsMonth: number; // 1-12
  obsYear: number;
  obsDate: string; // "YYYY-MM-DD" (last day of obs month)
  pdfUrl: string;
  postDate: string;
}

// PDF text patterns for CPI YoY extraction.
//
// CRITICAL ORDERING CONSTRAINT — all patterns MUST require an explicit YoY
// context qualifier. Do NOT add patterns that match a bare percentage after
// "CPI inflation" without verifying the surrounding text confirms year-on-year.
//
// Root cause of the June 2026 mis-read: PBS reports contain BOTH MoM and YoY
// figures in the same sentence, MoM first:
//   "CPI inflation recorded at 0.3% (Month-on-Month) and 12.6% (Year-on-Year)"
// A pattern that matches the first number after "CPI inflation" grabs 0.3 (MoM)
// and labels it "YoY", producing a bogus surprise vs the forecast.
//
// Patterns are ordered: most-restrictive YoY context first, broadest last.
const CPI_PATTERNS = [
  // 1. Number immediately followed by a YoY qualifier — the most common PBS format.
  //    "6.4 percent on year-on-year basis"  /  "6.4% (YoY)"  /  "6.4% YoY"
  /([\d.]+)\s*(?:percent|%)\s*(?:\([^)]*\))?\s*(?:on\s+)?(?:year[\s-]on[\s-]year|y[\s.-]?o[\s.-]?y\b|YoY)\b/i,

  // 2. YoY qualifier before the number within the same clause.
  //    "on year-on-year basis CPI increased by 6.4 percent"
  /(?:year[\s-]on[\s-]year|y[\s.-]?o[\s.-]?y\b|YoY)\b[^%\n.]{0,100}([\d.]+)\s*(?:percent|%)/i,

  // 3. "same month last year" / "same period last year" phrasing — PBS alternative.
  //    "compared to 12.6 percent in the same month last year"
  /([\d.]+)\s*(?:percent|%)[^.]{0,100}same\s+(?:period|month)\s+(?:of\s+|in\s+)?(?:the\s+)?last\s+year/i,
  /(?:compared\s+to|versus)\s+([\d.]+)\s*(?:percent|%)[^.]{0,50}(?:last\s+year|previous\s+year)/i,

  // 4. Table format: "National CPI (YoY)  6.4"  or  "General CPI (YoY)  6.4"
  /national\s+(?:consumer\s+price\s+index|CPI)[^0-9(]{0,30}\(YoY\)[^0-9]{0,40}([\d.]+)/i,
  /general\s+CPI\s+\(YoY\)[^0-9]{0,30}([\d.]+)/i,

  // 5. Annual phrasing: "annual CPI inflation rate of 6.4%"
  /\bannual\s+(?:CPI\s+)?inflation[^%\n.]{0,60}([\d.]+)\s*(?:percent|%)/i,
];

const CORE_PATTERNS = [
  // 1. NFNE with explicit YoY qualifier — required to avoid MoM matches.
  //    "Core inflation (NFNE Urban) 9.0% (year-on-year)"
  /core\s+inflation\s*\(NFNE[^)]*\)[^%\n]{0,80}?([\d.]+)\s*(?:percent|%)[^.]{0,60}(?:year[\s-]on[\s-]year|YoY|y[\s.-]?o[\s.-]?y\b|annual)/i,
  /([\d.]+)\s*(?:percent|%)\s*(?:\([^)]*\))?\s*(?:on\s+)?(?:year[\s-]on[\s-]year|YoY)\b[^.]{0,60}(?:NFNE|core|non.food)/i,

  // 2. "NFNE Urban" table row — NFNE is distinctive enough that MoM mis-match
  //    is unlikely, but require a plausible range in extractPercentage.
  /NFNE\s+Urban\s+([\d.]+)/i,

  // 3. Non-food Non-energy patterns with YoY context where possible.
  /non.food\s+non.energy[^%]{0,80}?([\d.]+)\s*(?:percent|%)[^.]{0,60}(?:year[\s-]on[\s-]year|YoY|y[\s.-]?o[\s.-]?y\b|annual)/i,
  /non.food\s+non.energy[^%]{0,80}?([\d.]+)\s*(?:percent|%)/i,

  // 4. "Core (NFNE) inflation" with YoY context.
  /core\s*\(?NFNE\)?[^%\n]{0,80}?([\d.]+)\s*(?:percent|%)[^.]{0,60}(?:year[\s-]on[\s-]year|YoY|annual)/i,
  /core\s*\(?NFNE\)?[^%\n]{0,80}?([\d.]+)\s*(?:percent|%)/i,
];

/**
 * Extract the first plausible percentage from text matching any of the patterns.
 *
 * Plausibility bounds:
 *   minPlausible: defaults to 0 (any positive value accepted). Pass a higher
 *   value (e.g. 0.5) to guard against MoM figures slipping through if the
 *   caller knows the expected metric has a higher floor. A value below the
 *   floor causes the match to be skipped rather than returned — the next
 *   pattern in the list is tried.
 *
 * This guard should NOT be used as a substitute for correct patterns — it is
 * a last-resort safety net only. If a pattern is firing on MoM text, fix the
 * pattern first.
 */
function extractPercentage(text: string, patterns: RegExp[], minPlausible = 0): number | null {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const v = parseFloat(m[1]);
      if (!isNaN(v) && v > minPlausible && v < 100) return v;
    }
  }
  return null;
}

const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseObsPeriod(text: string, title: string): { obsMonth: number; obsYear: number } | null {
  // Look in title first, then first 200 chars of body
  for (const src of [title, text.slice(0, 200)]) {
    const m = src.match(/([A-Za-z]+)\s*[,\-]?\s*(20\d{2})/);
    if (m) {
      const month = MONTH_NAMES[m[1].toLowerCase()];
      const year = parseInt(m[2], 10);
      if (month && !isNaN(year)) return { obsMonth: month, obsYear: year };
    }
  }
  return null;
}

async function parseCpiPdf(pdfUrl: string, title: string, postDate: string): Promise<CpiPbsResult> {
  const res = await fetch(pdfUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PBS CPI PDF fetch returned ${res.status} for ${pdfUrl}`);
  const buf = await res.arrayBuffer();

  // unpdf: serverless-safe PDF text extraction (no canvas, no native modules).
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });

  // minPlausible=0.5: guard against MoM figures slipping through if the YoY
  // patterns somehow match MoM context (Pakistan YoY CPI has never been < 0.5%
  // in the modern data era — a value this low indicates a MoM/WoW match, not YoY).
  // If this guard fires, the function throws and EasyData fallback handles the release.
  const cpiYoYPct = extractPercentage(text, CPI_PATTERNS, 0.5);
  if (cpiYoYPct === null) {
    throw new Error(
      `CPI PDF: could not extract CPI YoY percentage (patterns require explicit year-on-year context). ` +
      `If the value extracted was < 0.5% it was rejected as implausible for YoY CPI. ` +
      `PDF text (first 800 chars): ${text.slice(0, 800)}`,
    );
  }

  const coreYoYPct = extractPercentage(text, CORE_PATTERNS, 0.5);

  const period = parseObsPeriod(text, title);
  if (!period) {
    throw new Error(
      `CPI PDF: could not determine observation month/year from post title or PDF text. ` +
      `Title: "${title}"`,
    );
  }

  const lastDay = new Date(period.obsYear, period.obsMonth, 0).getDate();
  const obsDate = `${period.obsYear}-${String(period.obsMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { cpiYoYPct, coreYoYPct, obsMonth: period.obsMonth, obsYear: period.obsYear, obsDate, pdfUrl, postDate };
}

async function discoverCpiPost(): Promise<{
  title: string;
  content: string;
  pdfUrl: string;
  postDate: string;
}> {
  const params = new URLSearchParams({
    search: "Monthly Inflation Report",
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

  const post = posts.find((p) =>
    /monthly.inflation.report|consumer.price.index|CPI/i.test(p.title.rendered),
  );
  if (!post) throw new Error("No PBS Monthly Inflation Report post found in WordPress API");

  // Extract PDF URL from post HTML
  const hrefs = [...post.content.rendered.matchAll(/href="([^"]+\.pdf[^"]*)"/gi)].map((m) => m[1]);
  const pdfUrl =
    hrefs.find((h) => /inflation|cpi|report/i.test(h)) ??
    hrefs[0];
  if (!pdfUrl) {
    throw new Error(
      `PBS CPI post has no linked PDF. Title: "${post.title.rendered}". ` +
      `Content snippet: ${post.content.rendered.slice(0, 300)}`,
    );
  }

  return {
    title: post.title.rendered,
    content: post.content.rendered,
    pdfUrl,
    postDate: post.date,
  };
}

async function writeSyncResult(
  seriesSlug: string,
  yoyPct: number,
  obsDate: string,
  pdfUrl: string,
  postDate: string,
  sourceName: string,
): Promise<SyncResult> {
  const pubMeta = SERIES_PUBLICATION_META[seriesSlug];
  if (!pubMeta?.periodValidation) {
    return { seriesSlug, status: "skipped-not-configured", detail: `No period-validation config for ${seriesSlug}.` };
  }

  const supabase = createPublicDataClient();
  const workerSecret = process.env.NOTIFICATION_WORKER_SECRET ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const { data: dueEvents } = await supabase
    .from("economic_events")
    .select("event_date, economic_event_series!inner(slug)")
    .eq("economic_event_series.slug", seriesSlug)
    .eq("status", "scheduled")
    .lte("event_date", today)
    .order("event_date", { ascending: false })
    .limit(1);

  const dueEvent = dueEvents?.[0];
  if (!dueEvent) {
    return {
      seriesSlug,
      status: "skipped-no-due-event",
      detail: `No scheduled ${seriesSlug} event is due yet (today=${today}, PBS obs=${obsDate}).`,
    };
  }

  const periodCheck = validateObservationPeriod(obsDate, dueEvent.event_date, pubMeta.periodValidation);
  if (!periodCheck.valid) {
    return {
      seriesSlug,
      status: "skipped-period-mismatch",
      detail: `${periodCheck.reason} (PBS obs=${obsDate}, event=${dueEvent.event_date})`,
    };
  }

  const sign = yoyPct >= 0 ? "+" : "";
  const actualValue = `${sign}${yoyPct.toFixed(1)}% YoY`;

  const { data: didUpdate, error } = await supabase.rpc("sync_event_actual", {
    p_internal_secret: workerSecret,
    p_series_slug: seriesSlug,
    p_event_date: dueEvent.event_date,
    p_actual_value: actualValue,
    p_observation_date: obsDate,
  });

  if (error) return { seriesSlug, status: "error", detail: error.message };

  const provenance: SyncProvenance = {
    sourceName,
    sourceType: "official-pdf",
    observationPeriod: periodCheck.expectedPeriod ?? obsDate,
    observationDate: obsDate,
    syncTimestamp: new Date().toISOString(),
    dataConfidence: "confirmed",
  };

  if (didUpdate) {
    invalidate(`canonical-obs:${seriesSlug}`);
    return {
      seriesSlug,
      status: "synced",
      detail: `YoY=${actualValue} | obs=${obsDate} | postDate=${postDate} | pdf=${pdfUrl}`,
      provenance,
    };
  }
  return {
    seriesSlug,
    status: "skipped-no-due-event",
    detail: `${seriesSlug} event already released.`,
  };
}

/**
 * Syncs both CPI YoY and NFNE Core inflation from the PBS Monthly Inflation
 * Report PDF (primary source). Returns two SyncResult entries — one per series.
 *
 * The EasyData sync (syncFromSbpEasyData.ts) acts as fallback: if PBS writes
 * the events first, EasyData's RPC calls return false (already released).
 */
export async function syncCpiFromPbs(): Promise<SyncResult[]> {
  const fetchStart = new Date();
  const results: SyncResult[] = [];

  let pbsData: CpiPbsResult;
  try {
    const post = await discoverCpiPost();
    pbsData = await parseCpiPdf(post.pdfUrl, post.title, post.postDate);
  } catch (fetchErr) {
    const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    void recordSourceAttempt(
      { success: false, sourceName: "PBS Monthly Inflation Report PDF", sourceType: "official-pdf", isFallback: false, error: errMsg },
      CPI_SERIES_SLUG,
      fetchStart,
      "cpi-pbs-sync",
    );
    const errResult: SyncResult = { seriesSlug: CPI_SERIES_SLUG, status: "error", detail: `PBS CPI PDF failed: ${errMsg}` };
    return [errResult, { ...errResult, seriesSlug: CORE_SERIES_SLUG }];
  }

  void recordSourceAttempt(
    { success: true, observationDate: pbsData.obsDate, sourceName: "PBS Monthly Inflation Report PDF", sourceType: "official-pdf", isFallback: false },
    CPI_SERIES_SLUG,
    fetchStart,
    "cpi-pbs-sync",
  );

  // Write CPI
  results.push(
    await writeSyncResult(
      CPI_SERIES_SLUG,
      pbsData.cpiYoYPct,
      pbsData.obsDate,
      pbsData.pdfUrl,
      pbsData.postDate,
      "PBS Monthly Inflation Report PDF — Headline CPI",
    ),
  );

  // Write Core (NFNE) — skip if not found in PDF rather than erroring
  if (pbsData.coreYoYPct !== null) {
    results.push(
      await writeSyncResult(
        CORE_SERIES_SLUG,
        pbsData.coreYoYPct,
        pbsData.obsDate,
        pbsData.pdfUrl,
        pbsData.postDate,
        "PBS Monthly Inflation Report PDF — Urban NFNE Core",
      ),
    );
  } else {
    results.push({
      seriesSlug: CORE_SERIES_SLUG,
      status: "error",
      detail: "PBS CPI PDF: NFNE core inflation not found in PDF text — EasyData fallback will handle core.",
    });
  }

  return results;
}
