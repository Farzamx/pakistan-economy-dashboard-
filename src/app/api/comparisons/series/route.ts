import { NextResponse } from "next/server";
import { fetchComparisonSeries, mergeSeries } from "@/lib/comparisons/comparisonData";
import { ALL_SERIES_OPTIONS } from "@/lib/comparisons/seriesOptions";
import type { SeriesProviderId } from "@/lib/comparisons/comparisonRegistry";

const VALID_IDS = new Set(ALL_SERIES_OPTIONS.map((o) => o.id));

function isValidId(value: string | null): value is SeriesProviderId {
  return value !== null && VALID_IDS.has(value as SeriesProviderId);
}

// Powers the free-form "Indicator Selector" (compare any two available
// indicators) — same underlying fetchComparisonSeries()/mergeSeries() the
// pre-built comparison cards use, just driven by user-chosen series ids
// instead of a fixed registry entry. Live data only; returns an error
// rather than any placeholder/estimated series on failure.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const aId = searchParams.get("a");
  const bId = searchParams.get("b");

  if (!isValidId(aId) || !isValidId(bId)) {
    return NextResponse.json({ error: "Invalid or missing series id(s)." }, { status: 400 });
  }

  const [a, b] = await Promise.all([fetchComparisonSeries(aId), fetchComparisonSeries(bId)]);
  if (!a || !b) {
    return NextResponse.json({ error: "One or both series are unavailable right now." }, { status: 502 });
  }

  return NextResponse.json({
    merged: mergeSeries(a, b),
    sourceA: a.source,
    sourceB: b.source,
  });
}
