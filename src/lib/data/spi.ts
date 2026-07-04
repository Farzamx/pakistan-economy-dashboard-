import * as XLSX from "xlsx";
import { revalidateTag } from "next/cache";
import { dedupeInFlight, getFresh, invalidate, setCache } from "@/lib/memoryCache";

// Pakistan Bureau of Statistics — Weekly Sensitive Price Indicator (SPI),
// base 2015-16=100, "Combined" expenditure group (all quintiles).
//
// PBS publishes a new report every Friday at https://www.pbs.gov.pk/, as a
// WordPress post titled "Weekly Sensitive Price Indicator (SPI) for the
// week ended on DD-MM-YYYY", with a real .xlsx "Report" file attached.
//
// The .xlsx filename convention has changed at least twice historically
// (confirmed by directly probing older URLs — two plausible historical
// filenames both returned an HTML page disguised as a 200 response, not a
// real file), so this deliberately never constructs a URL from a date
// formula. Instead it discovers the current file from PBS's own official,
// unauthenticated WordPress REST API
// (https://www.pbs.gov.pk/wp-json/wp/v2/posts), which returns the latest
// post's content as structured JSON — the only HTML touched is a small,
// stable regex pulling the .xlsx href out of that JSON's `content.rendered`
// field. No numbers are ever scraped from a page; every value comes from
// parsing the real .xlsx file with the same `xlsx` library used elsewhere
// in this project (quarterlyGdp.ts, externalDebt.ts).
const PBS_API_BASE = "https://www.pbs.gov.pk/wp-json/wp/v2/posts";
const PBS_SEARCH_QUERY = "Sensitive Price Indicator";

// SPI is published once a week, always on Friday. A 12h window means the
// dashboard picks up a new Friday release within at most half a day, and
// otherwise makes at most two checks a day against PBS — appropriately
// conservative for an indicator that only ever changes once a week. This is
// the L2 (Next.js Data Cache) window, tagged so the calendar-sync cron can
// force an immediate refresh the moment it confirms new PBS data — see
// invalidateSpiCache() — rather than waiting out this window passively.
const REVALIDATE_WEEKLY_SECONDS = 60 * 60 * 12;
const CACHE_TAG = "spi-data";
const FETCH_TIMEOUT_MS = 10_000;

// L1 (in-memory) fast path — deliberately much shorter than the L2 window
// above. Production Audit Part 2 traced a real incident to this L1 cache
// previously sharing L2's full 12h TTL: even after the cron pushed a fresh
// L2 value, a quiet-traffic Overview KPI request could still be served an
// L1 entry up to 12h old. A short, SBP-style TTL here bounds that residual
// staleness to minutes regardless of whether cross-instance L1 invalidation
// is possible (it isn't, on serverless — see invalidateSpiCache()).
const L1_TTL_MS = 10 * 60 * 1000;

export interface SpiPoint {
  /** "YYYY-MM-DD", week-ended date. */
  date: string;
  /** Combined SPI index, base 2015-16=100. */
  value: number;
  /** % change vs the previous week, as published by PBS. */
  wowPct: number;
  /** % change vs the corresponding week a year earlier, as published by PBS. */
  yoyPct: number;
}

export interface SpiResult {
  /** Oldest -> newest. PBS embeds roughly the trailing 10 weeks in each report — there is no separate multi-year archive file. */
  points: SpiPoint[];
  source: "PBS";
}

interface WpPost {
  title: { rendered: string };
  content: { rendered: string };
  date: string;
}

async function discoverLatestSpiReportUrl(): Promise<string> {
  const params = new URLSearchParams({
    search: PBS_SEARCH_QUERY,
    per_page: "1",
    orderby: "date",
    order: "desc",
  });
  const res = await fetch(`${PBS_API_BASE}?${params.toString()}`, {
    next: { revalidate: REVALIDATE_WEEKLY_SECONDS, tags: [CACHE_TAG] },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`PBS WordPress API returned ${res.status}`);

  const posts = (await res.json()) as WpPost[];
  const post = posts[0];
  // Matches either the current full title ("...Sensitive Price Indicator
  // (SPI)...") or a shortened future title that only uses the "SPI"
  // abbreviation — resilient to PBS rewording the post title, as long as
  // either form is still present somewhere in it.
  if (!post || !/sensitive price indicator|\bSPI\b/i.test(post.title.rendered)) {
    throw new Error("PBS WordPress API did not return a matching SPI post");
  }

  // The post body links both the item-level "Annex" file and the
  // aggregate "Report" file — only the Report file has the Combined SPI
  // index table this function needs.
  const hrefs = [...post.content.rendered.matchAll(/href="([^"]+\.xlsx)"/gi)].map((m) => m[1]);
  const reportUrl = hrefs.find((h) => /report/i.test(h));
  if (!reportUrl) throw new Error("PBS SPI post has no linked .xlsx Report file");
  return reportUrl;
}

function parseCombinedSpiTable(buf: ArrayBuffer): SpiPoint[] {
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const sheet = wb.Sheets["Page 1"];
  if (!sheet) throw new Error('Sheet "Page 1" not found in SPI report');

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];

  const headerIdx = rows.findIndex((row) => row[1] === "Week ended on");
  if (headerIdx === -1) throw new Error('"Week ended on" table header not found in SPI report');

  // The data columns below are read by fixed position (5/6/7) — confirm
  // the header row still labels column 5 "Combined SPI" before trusting
  // that position. If PBS ever reorders these columns, this throws
  // (falling into the existing null-on-failure path) instead of silently
  // reading the wrong column into `value`.
  if (rows[headerIdx][5] !== "Combined SPI") {
    throw new Error('Expected "Combined SPI" in column 5 of the header row — column layout may have changed');
  }

  const points: SpiPoint[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const dateStr = row[1];
    if (typeof dateStr !== "string" || !/^\d{1,2}-\d{2}-\d{4}$/.test(dateStr)) break; // table ends at the first non-data row

    const combinedValue = row[5];
    const wowPct = row[6];
    const yoyPct = row[7];
    if (typeof combinedValue !== "number" || typeof wowPct !== "number" || typeof yoyPct !== "number") continue;

    const [day, month, year] = dateStr.split("-");
    points.push({
      date: `${year}-${month}-${day.padStart(2, "0")}`,
      value: combinedValue,
      wowPct,
      yoyPct,
    });
  }

  if (points.length === 0) throw new Error("No Combined SPI data points extracted from report");
  return points;
}

/**
 * Weekly Sensitive Price Indicator (Combined group), oldest -> newest.
 * Returns null on failure — no fabricated fallback for a series this
 * source-dependent; callers must render an honest unavailable state.
 */
export async function getSpiHistory(): Promise<SpiResult | null> {
  const cacheKey = "pbs-spi-history";
  const cached = getFresh<SpiResult>(cacheKey, L1_TTL_MS);
  if (cached) return cached.data;

  try {
    return await dedupeInFlight(cacheKey, async () => {
      const reportUrl = await discoverLatestSpiReportUrl();
      const res = await fetch(reportUrl, {
        next: { revalidate: REVALIDATE_WEEKLY_SECONDS, tags: [CACHE_TAG] },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`PBS SPI report fetch returned ${res.status}`);
      const buf = await res.arrayBuffer();
      const points = parseCombinedSpiTable(buf);
      const result: SpiResult = { points, source: "PBS" };
      setCache(cacheKey, result);
      return result;
    });
  } catch {
    return null;
  }
}

/**
 * Live fetch from PBS — bypasses both the L1 in-memory cache and the L2
 * Next.js Data Cache (uses cache:"no-store" on both fetch calls). Intended
 * exclusively for the cron sync path so it detects a new PBS publication
 * immediately rather than waiting up to 12 h for the Data Cache to expire
 * naturally. Warms L1 on success so page-render calls to getSpiHistory()
 * that happen shortly after a cron run are served from memory rather than
 * from the potentially stale L2 entry.
 *
 * Why a separate function rather than a flag on getSpiHistory(): mixing
 * cache:"no-store" and next:{revalidate,tags} in the same code path is
 * error-prone — the two options are mutually exclusive in Next.js fetch.
 * Keeping them in separate functions makes the intent unambiguous.
 */
export async function getSpiHistoryFresh(): Promise<SpiResult | null> {
  try {
    const params = new URLSearchParams({
      search: PBS_SEARCH_QUERY,
      per_page: "1",
      orderby: "date",
      order: "desc",
    });
    const postRes = await fetch(`${PBS_API_BASE}?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!postRes.ok) throw new Error(`PBS WordPress API returned ${postRes.status}`);

    const posts = (await postRes.json()) as WpPost[];
    const post = posts[0];
    if (!post || !/sensitive price indicator|\bSPI\b/i.test(post.title.rendered)) {
      throw new Error("PBS WordPress API did not return a matching SPI post");
    }
    const hrefs = [...post.content.rendered.matchAll(/href="([^"]+\.xlsx)"/gi)].map((m) => m[1]);
    const reportUrl = hrefs.find((h) => /report/i.test(h));
    if (!reportUrl) throw new Error("PBS SPI post has no linked .xlsx Report file");

    const fileRes = await fetch(reportUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!fileRes.ok) throw new Error(`PBS SPI report fetch returned ${fileRes.status}`);
    const buf = await fileRes.arrayBuffer();
    const points = parseCombinedSpiTable(buf);
    const result: SpiResult = { points, source: "PBS" };
    setCache("pbs-spi-history", result);
    return result;
  } catch {
    return null;
  }
}

/** Called by the calendar-sync cron right after it confirms a fresh PBS SPI release — see sbp.ts's invalidateSbpIndicatorCache() for the full reasoning (same pattern, applied to PBS instead of SBP EasyData). */
export function invalidateSpiCache(): void {
  invalidate("pbs-spi-history");
  revalidateTag(CACHE_TAG, "max");
}
