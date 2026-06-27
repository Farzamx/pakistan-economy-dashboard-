// One-time/regenerable generator for supabase/migrations/0003_economic_calendar_seed.sql.
// Run with: npx tsx scripts/generateEconomicCalendarSeed.ts
//
// Derives economic_event_series rows from the mock data's distinct "base
// titles" (stripping a trailing " (Month Year)"-style parenthetical, since
// e.g. "Trade Balance (June 2026)" and "Trade Balance (July 2026)" are two
// INSTANCES of the same series, not two series) and economic_events rows
// from every individual mock record — including the historical ones added
// specifically to seed the Archive. Re-run this whenever
// economicCalendarEvents.ts changes; it always regenerates the whole file
// (idempotent ON CONFLICT upserts on the way into Postgres), so there's
// nothing to hand-edit in the generated SQL itself.

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { ECONOMIC_CALENDAR_EVENTS, ECONOMIC_CALENDAR_HISTORICAL_EVENTS } from "../src/data/economicCalendarEvents";
import type { EconomicEvent, EventCategory } from "../src/lib/economicCalendar/economicCalendarTypes";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface SeriesMeta {
  slug: string;
  title: string;
  category: EventCategory;
  defaultImportance: string;
  cadence: "weekly" | "monthly" | "quarterly" | "annual" | "irregular";
  sourceName: string;
  sourceUrl: string | null;
  automationTier: "automated" | "semi_automated" | "manual";
  reliabilityScore: number;
  description: string;
}

function baseTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) return "null";
  return `'${value.replace(/'/g, "''")}'`;
}

// Per-base-title metadata, grounded in the Phase 2 source audit
// (SBP/PBS/MoF/PSX/IMF). Phase 2B removed Oil Price Update and US Federal
// Reserve FOMC (non-Pakistan events — see economicCalendarEvents.ts) and
// added Treasury Bill/PIB auctions, Core Inflation, LSM, Government Debt,
// and PSX Holiday Calendar to close the gap against the explicit
// Pakistan-only event list. automationTier "automated" here means a real,
// already-integrated SBP EasyData series exists (src/lib/data/sbp.ts) that
// Phase 2B's sync route reads directly — not aspirational.
const SERIES_META: Record<string, Omit<SeriesMeta, "slug" | "title" | "category" | "defaultImportance" | "description">> = {
  "SPI Weekly Inflation Release": { cadence: "weekly", sourceName: "Pakistan Bureau of Statistics", sourceUrl: "https://www.pbs.gov.pk/spi", automationTier: "automated", reliabilityScore: 4 },
  "SBP Foreign Exchange Reserves": { cadence: "weekly", sourceName: "State Bank of Pakistan", sourceUrl: "https://www.sbp.org.pk/ecodata/index2.asp", automationTier: "automated", reliabilityScore: 5 },
  "KSE-100 Weekly Market Review": { cadence: "weekly", sourceName: "Pakistan Stock Exchange", sourceUrl: "https://www.psx.com.pk/", automationTier: "semi_automated", reliabilityScore: 4 },
  "Trade Balance": { cadence: "monthly", sourceName: "Pakistan Bureau of Statistics", sourceUrl: "https://www.pbs.gov.pk/", automationTier: "automated", reliabilityScore: 4 },
  "CPI Inflation Release": { cadence: "monthly", sourceName: "Pakistan Bureau of Statistics", sourceUrl: "https://www.pbs.gov.pk/cpi", automationTier: "automated", reliabilityScore: 4 },
  "Core Inflation Release": { cadence: "monthly", sourceName: "Pakistan Bureau of Statistics / SBP EasyData", sourceUrl: "https://www.pbs.gov.pk/cpi", automationTier: "automated", reliabilityScore: 4 },
  "Current Account Balance": { cadence: "monthly", sourceName: "State Bank of Pakistan", sourceUrl: "https://www.sbp.org.pk/ecodata/index2.asp", automationTier: "automated", reliabilityScore: 4 },
  "Worker Remittances": { cadence: "monthly", sourceName: "State Bank of Pakistan", sourceUrl: "https://www.sbp.org.pk/ecodata/homeremit.pdf", automationTier: "automated", reliabilityScore: 4 },
  "SBP Monetary Policy Committee Meeting": { cadence: "irregular", sourceName: "State Bank of Pakistan", sourceUrl: "https://www.sbp.org.pk/m_policy/mp-calendar.asp", automationTier: "semi_automated", reliabilityScore: 5 },
  "GDP Growth Release": { cadence: "quarterly", sourceName: "Pakistan Bureau of Statistics", sourceUrl: "https://www.pbs.gov.pk/national-accounts-2/", automationTier: "semi_automated", reliabilityScore: 5 },
  "Large Scale Manufacturing (LSM) Growth": { cadence: "monthly", sourceName: "Pakistan Bureau of Statistics / SBP EasyData", sourceUrl: "https://www.pbs.gov.pk/", automationTier: "automated", reliabilityScore: 4 },
  "Treasury Bill Auction": { cadence: "weekly", sourceName: "State Bank of Pakistan", sourceUrl: "https://www.sbp.org.pk/ecodata/index2.asp", automationTier: "automated", reliabilityScore: 4 },
  "PIB Auction": { cadence: "monthly", sourceName: "State Bank of Pakistan", sourceUrl: "https://www.sbp.org.pk/ecodata/index2.asp", automationTier: "automated", reliabilityScore: 4 },
  "Government Debt Release": { cadence: "quarterly", sourceName: "State Bank of Pakistan", sourceUrl: "https://www.sbp.org.pk/ecodata/index2.asp", automationTier: "semi_automated", reliabilityScore: 4 },
  "Pakistan Economic Survey": { cadence: "annual", sourceName: "Ministry of Finance", sourceUrl: "https://www.finance.gov.pk/", automationTier: "manual", reliabilityScore: 2 },
  "Federal Budget": { cadence: "annual", sourceName: "Ministry of Finance", sourceUrl: "https://www.finance.gov.pk/", automationTier: "manual", reliabilityScore: 2 },
  "PSX Holiday Calendar": { cadence: "annual", sourceName: "Pakistan Stock Exchange", sourceUrl: "https://www.psx.com.pk/psx/exchange/general/calendar-holidays", automationTier: "semi_automated", reliabilityScore: 4 },
};

function metaFor(base: string): SeriesMeta["cadence"] extends never ? never : Omit<SeriesMeta, "slug" | "title" | "category" | "defaultImportance" | "description"> {
  const found = SERIES_META[base];
  if (found) return found;
  // "Pakistan Economic Survey 2026-27" / "Federal Budget 2027-28 Presentation"
  // don't end in a stripped parenthetical, so fall back to a prefix match.
  const prefixMatch = Object.keys(SERIES_META).find((key) => base.startsWith(key));
  if (prefixMatch) return SERIES_META[prefixMatch];
  throw new Error(`No SERIES_META entry for base title "${base}" — add one in generateEconomicCalendarSeed.ts.`);
}

function buildSeries(events: EconomicEvent[]): SeriesMeta[] {
  const byBase = new Map<string, EconomicEvent[]>();
  for (const e of events) {
    const base = baseTitle(e.title);
    const key = SERIES_META[base] ? base : Object.keys(SERIES_META).find((k) => base.startsWith(k)) ?? base;
    byBase.set(key, [...(byBase.get(key) ?? []), e]);
  }
  return Array.from(byBase.entries()).map(([base, instances]) => {
    const first = instances[0];
    const meta = metaFor(base);
    return {
      slug: slugify(base),
      title: base,
      category: first.category,
      defaultImportance: first.importance,
      description: first.description,
      ...meta,
    };
  });
}

function seriesSlugForEvent(event: EconomicEvent): string {
  const base = baseTitle(event.title);
  const key = SERIES_META[base] ? base : Object.keys(SERIES_META).find((k) => base.startsWith(k));
  if (!key) throw new Error(`No series mapping for event "${event.title}"`);
  return slugify(key);
}

const allEvents = [...ECONOMIC_CALENDAR_EVENTS, ...ECONOMIC_CALENDAR_HISTORICAL_EVENTS];
const series = buildSeries(allEvents);

const lines: string[] = [];
lines.push("-- Economic Calendar Phase 2A — seed data, generated from src/data/economicCalendarEvents.ts");
lines.push("-- by scripts/generateEconomicCalendarSeed.ts. Regenerate this file (do not hand-edit) whenever");
lines.push("-- the mock data changes. Run AFTER 0002_economic_calendar_events.sql, in the Supabase SQL editor.");
lines.push("-- Every INSERT is an idempotent upsert (ON CONFLICT ... DO UPDATE), so re-running this file is safe.");
lines.push("");
lines.push(`-- ${series.length} series, ${allEvents.length} events.`);
lines.push("");

for (const s of series) {
  lines.push(
    `insert into public.economic_event_series (slug, title, category, default_importance, cadence, source_name, source_url, automation_tier, reliability_score, description)\n` +
      `values (${sqlString(s.slug)}, ${sqlString(s.title)}, ${sqlString(s.category)}, ${sqlString(s.defaultImportance)}, ${sqlString(s.cadence)}, ${sqlString(s.sourceName)}, ${sqlString(s.sourceUrl)}, ${sqlString(s.automationTier)}, ${s.reliabilityScore}, ${sqlString(s.description)})\n` +
      `on conflict (slug) do update set title = excluded.title, category = excluded.category, default_importance = excluded.default_importance, cadence = excluded.cadence, source_name = excluded.source_name, source_url = excluded.source_url, automation_tier = excluded.automation_tier, reliability_score = excluded.reliability_score, description = excluded.description, updated_at = now();`,
  );
}

lines.push("");

for (const e of allEvents) {
  const seriesSlug = seriesSlugForEvent(e);
  const status = e.status ?? (e.actual ? "released" : "scheduled");
  const dataConfidence = e.actual ? "confirmed" : "estimated";
  lines.push(
    `insert into public.economic_events (series_id, slug, title, event_date, event_time, previous_value, forecast_value, actual_value, status, importance, description, data_confidence)\n` +
      `values ((select id from public.economic_event_series where slug = ${sqlString(seriesSlug)}), ${sqlString(e.id)}, ${sqlString(e.title)}, ${sqlString(e.date)}, ${sqlString(e.time)}, ${sqlString(e.previous)}, ${sqlString(e.forecast)}, ${sqlString(e.actual ?? null)}, ${sqlString(status)}, ${sqlString(e.importance)}, ${sqlString(e.description)}, ${sqlString(dataConfidence)})\n` +
      `on conflict (slug) do update set series_id = excluded.series_id, title = excluded.title, event_date = excluded.event_date, event_time = excluded.event_time, previous_value = excluded.previous_value, forecast_value = excluded.forecast_value, actual_value = excluded.actual_value, status = excluded.status, importance = excluded.importance, description = excluded.description, data_confidence = excluded.data_confidence, updated_at = now();`,
  );
}

const outPath = join(__dirname, "..", "supabase", "migrations", "0003_economic_calendar_seed.sql");
writeFileSync(outPath, lines.join("\n") + "\n");
console.log(`Wrote ${outPath} — ${series.length} series, ${allEvents.length} events.`);
