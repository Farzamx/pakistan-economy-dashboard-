import { NextResponse } from "next/server";

// TEMPORARY — Phase 6A.2 production SBP EasyData 403 investigation.
// Self-contained: makes its own direct call to SBP EasyData, bypassing
// sbp.ts's cache/fallback layers entirely, so the exact status/body of a
// real request FROM THIS RUNTIME can be inspected without Vercel
// dashboard/log access. Never logs or returns the full API key. Delete
// this whole file once the root cause is confirmed.
//
// Auth: same CRON_SECRET bearer token every other /api/admin/* route uses.
// Usage: GET /api/admin/sbp-diag[?series=<seriesKey>]
export const dynamic = "force-dynamic";

const DEFAULT_SERIES_KEY = "TS_GP_BAM_M2_W.M000070"; // Money Supply (M2) — one of the confirmed-stale indicators

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const seriesKey = searchParams.get("series") ?? DEFAULT_SERIES_KEY;

  const apiKey = process.env.SBP_EASYDATA_API_KEY;
  const keyPresent = !!apiKey;
  const keyLength = apiKey?.length ?? 0;
  const keyPreview = apiKey
    ? apiKey.length >= 8
      ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
      : "(present, too short to preview safely)"
    : "(missing)";

  const runtimeInfo = {
    VERCEL: process.env.VERCEL ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_REGION: process.env.VERCEL_REGION ?? null,
    checkedAt: new Date().toISOString(),
  };

  if (!apiKey) {
    return NextResponse.json({ keyPresent, keyLength, keyPreview, runtimeInfo, seriesKey, error: "SBP_EASYDATA_API_KEY is not set in this runtime" });
  }

  const base = "https://easydata.sbp.org.pk/api/v1/series";
  const params = new URLSearchParams({ api_key: apiKey, start_date: "2026-01-01", format: "json" });
  const redactedParams = new URLSearchParams({ api_key: keyPreview, start_date: "2026-01-01", format: "json" });
  const requestUrl = `${base}/${seriesKey}/data?${params.toString()}`;
  const redactedUrl = `${base}/${seriesKey}/data?${redactedParams.toString()}`;

  try {
    const response = await fetch(requestUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const bodyText = await response.text();
    return NextResponse.json({
      keyPresent,
      keyLength,
      keyPreview,
      runtimeInfo,
      seriesKey,
      requestUrl: redactedUrl,
      status: response.status,
      statusText: response.statusText,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      bodyPreview: bodyText.slice(0, 1500),
    });
  } catch (err) {
    return NextResponse.json({
      keyPresent,
      keyLength,
      keyPreview,
      runtimeInfo,
      seriesKey,
      requestUrl: redactedUrl,
      fetchError: err instanceof Error ? err.message : String(err),
      fetchErrorName: err instanceof Error ? err.name : undefined,
    });
  }
}
