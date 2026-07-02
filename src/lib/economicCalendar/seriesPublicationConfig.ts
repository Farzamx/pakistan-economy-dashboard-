// Centralized Publication Configuration, Source Hierarchy & Pending Automation Registry
//
// SINGLE SOURCE OF TRUTH for every calendar series' operational metadata:
//
//   1. SERIES_PUBLICATION_META — publication timing, source hierarchy, gap
//      detection config, cache invalidation tags, notification priority.
//      Any sync module that needs to know "when does SBP/PBS publish month
//      M's data?" or "which source do we try first?" imports from here.
//
//   2. PENDING_AUTOMATION_REGISTRY — structured record of every series whose
//      automation is blocked, why, what unblocks it, estimated complexity,
//      and any cross-series dependencies. Replaces ad-hoc removal comments.
//
// EXTENSION RULES:
//   Adding a new automated indicator:
//     Step 1 — add an entry to SERIES_PUBLICATION_META (timing + source config).
//     Step 2 — add an entry to SYNC_TARGETS in syncFromSbpEasyData.ts
//              (source-specific: indicatorKey + format function only).
//     No changes to the validator or the core sync loop are ever needed.
//
//   Blocking automation for a series:
//     Step 1 — set periodValidation: undefined in SERIES_PUBLICATION_META.
//     Step 2 — add an entry to PENDING_AUTOMATION_REGISTRY (blocker + resolution path).
//     NEVER silently remove a series from SYNC_TARGETS — document it here instead.
//
// SOURCE HIERARCHY (Phase 3):
//   sourceHierarchy is an ordered list of data sources. The sync pipeline
//   tries each entry in order; the first source that returns a live,
//   non-fallback observation for the correct period wins. Sources with
//   implemented=false are documented for future development but never called.
//   This is the single place to change when a new source comes online.

import type { PeriodValidationConfig } from "@/lib/economicCalendar/observationPeriodValidator";

// ─── Types ───────────────────────────────────────────────────────────────────

/** One entry in the ordered source chain for a series. */
export interface SourceHierarchyEntry {
  /** Human-readable source name shown in sync logs and provenance records. */
  name: string;
  /**
   * Source type — determines which adapter the Phase 3 resolver calls.
   *   sbp-easydata   : getSbpIndicator() from src/lib/data/sbp.ts (already integrated)
   *   pbs-web        : HTTP scrape of pbs.gov.pk (not yet implemented)
   *   sbp-web        : HTTP scrape of sbp.org.pk press-release pages
   *   official-pdf   : PDF parse of SBP/PBS official result PDFs
   *   official-csv   : Official CSV/Excel download (PBS FTS, SBP data portals)
   *   manual         : No automation path; human entry only
   */
  type: "sbp-easydata" | "pbs-web" | "sbp-web" | "official-pdf" | "official-csv" | "manual";
  /**
   * For sbp-easydata type: the indicatorKey passed to getSbpIndicator().
   * Matches keys in SbpIndicatorKey union in src/lib/data/sbp.ts.
   */
  indicatorKey?: string;
  /** URL for web-scrape or PDF types — where the data lives. */
  sourceUrl?: string;
  /** Whether this source adapter is currently implemented and callable. */
  implemented: boolean;
  /** Caveats, methodology notes, or reason not yet implemented. */
  note?: string;
}

/**
 * Configuration for Phase 2 automatic gap detection.
 * The cron's gap detector uses this to find and fill missing historical events
 * for series whose automation would otherwise leave calendar gaps if a cron
 * run is missed, a migration is skipped, or a release is not yet seeded.
 *
 * Applies only to monthly (lagMonths-based) series. Weekly and as-needed
 * series have irregular dates and are not gap-detected.
 */
export interface GapDetectionConfig {
  /** Slug prefix for generated event slugs, e.g. "cpi" → "cpi-2026-06-10". */
  slugPrefix: string;
  /**
   * How many months to look back from today when scanning for missing events.
   * Should be short enough that the data source (e.g. SBP EasyData) can still
   * provide the observation; typical: 3–4 months.
   */
  lookbackMonths: number;
  /**
   * Tolerance window in calendar days for checking whether an event already
   * exists near the expected release date (±windowDays). Prevents creating
   * duplicate events when release dates shift slightly month-to-month.
   */
  windowDays: number;
  /**
   * Approximate day-of-month for the expected release. Used to generate
   * candidate dates. The actual date may differ by ±5 days; windowDays
   * covers this variance.
   */
  expectedDayOfMonth: number;
  /** Default event time in "HH:MM" format, matching economic_event_series.default_event_time. */
  eventTimeOfDay: string;
  /** Importance level to set on auto-created events. */
  importance: "High" | "Medium" | "Low";
  /**
   * Title template for auto-created events. Uses {month} placeholder that
   * the gap detector replaces with the observation month label (e.g. "June 2026"),
   * consistent with rolling calendar's event_title_template convention in
   * migration 0013.
   */
  titleTemplate: string;
}

export interface SeriesPublicationMeta {
  /**
   * Observation-period validation config passed directly to
   * validateObservationPeriod() before any DB write. Set to `undefined`
   * for series that are not currently automated (manual, pending, or
   * requiring a source decision). The sync loop treats `undefined` as
   * "do not write" and surfaces a "skipped-not-configured" result.
   */
  periodValidation: PeriodValidationConfig | undefined;
  /**
   * Human-readable description of the official publication schedule,
   * including the expected lag and any caveats.
   */
  publicationSchedule: string;
  /**
   * Official source name — must match economic_event_series.source_name in
   * the database to avoid source attribution errors.
   */
  officialSource: string;
  /**
   * True when syncOfficialCalendars.ts already fetches an advance date
   * calendar for this series (MPC, T-bills, PIB). False = recurrence is
   * estimated by the rolling-calendar cron.
   */
  advanceCalendarAvailable: boolean;
  /**
   * Ordered source hierarchy for Phase 3 multi-source synchronization.
   * The sync pipeline tries each entry in order; first live non-fallback
   * observation for the correct period wins. Determines the "earliest
   * official publication" policy: the highest-priority implemented source
   * is used even if a later source would have the same data.
   */
  sourceHierarchy: SourceHierarchyEntry[];
  /**
   * Phase 2 gap detection configuration. Defined only for monthly
   * automated series where historical events might be missing. Undefined
   * for weekly, as-needed, manual, or pending series.
   */
  gapDetection?: GapDetectionConfig;
  /**
   * Priority level for triggering subscriber notifications after a release.
   * Drives notification-job creation in the trigger and display ordering
   * on the UI. Critical = real-time policy/market impact; low = informational.
   */
  notificationPriority: "critical" | "high" | "medium" | "low";
  /**
   * Next.js Data Cache tags to revalidate after a confirmed update.
   * These match the tags set by revalidateTag() calls across the indicator
   * fetch layer (src/lib/data/). Kept here rather than inline in sync
   * functions so a new source adapter knows exactly which tags to bust.
   */
  cacheTagsToInvalidate: string[];
}

export interface PendingAutomationEntry {
  /** Matches economic_event_series.slug in the database. */
  seriesSlug: string;
  /** Display name for dashboards and reports. */
  indicator: string;
  /** Current state of the series in the DB automation_tier column. */
  currentStatus: "manual" | "semi-automated";
  /**
   * Precise, actionable description of why full automation is blocked.
   * Include data evidence so the next maintainer can resolve it without
   * re-deriving the issue from scratch.
   */
  automationBlocker: string;
  /** Where the correct data must come from to enable automation. */
  requiredSource: string;
  /** Concrete implementation approach once the source is resolved. */
  plannedMethod: string;
  priority: "P1-critical" | "P2-high" | "P3-medium";
  /** Rough effort estimate once the blocker is resolved. */
  estimatedComplexity: "low" | "medium" | "high";
  /**
   * Other series that must be resolved first. Empty = can be implemented
   * independently. Prevents work on a series that depends on unresolved
   * infrastructure.
   */
  blockedBy: string[];
  addedDate: string; // ISO "YYYY-MM-DD"
}

// ─── Phase 5 Audit: Source Latency per Indicator (2026-07-01) ────────────────
//
// Every automated indicator audited for: (a) earliest trustworthy official
// source, (b) typical publication timing, (c) delay between official publication
// and our source updating.
//
// FINDING: Every automated indicator already uses the fastest machine-readable
// official source. SBP EasyData updates on the same day as each PBS/SBP release
// for all monthly indicators. PBS SPI is fetched from the direct PBS source.
// LSM YoY is derived from the authoritative EasyData quantum-index series.
//
// The only latency gap was cron frequency, not source selection:
//   Before: Vercel cron at 18:00 UTC (23:00 PKT) — if PBS releases CPI at
//           10:00 PKT, we detect it ~13 hours later.
//   After:  GitHub Actions fires every 15 minutes (.github/workflows/
//           sync-economic-calendar.yml). Data detected within ~15 minutes of
//           SBP EasyData updating, which itself updates same-day as the release.
//
// Per-indicator publication timing (approximate, PKT = UTC+5):
//   cpi-inflation-release        : ~10:00 PKT, 1st-10th of M+1
//   core-inflation-release       : same day as CPI (released simultaneously)
//   current-account-balance      : ~17:00 PKT, ~15th of M+2
//   worker-remittances           : ~16:00 PKT, ~10th of M+2
//   treasury-bill-auction-3m/pib : auction day, EasyData lag 0-2 days
//   sbp-monetary-policy-..       : meeting day, EasyData lag 0-2 days
//   spi-weekly-inflation-release : Thursday, PBS feed updates same-day
//   large-scale-manufacturing-.. : ~15th-18th of M+2, EasyData same-day
//
// Blocked indicators (sources unresolved — see PENDING_AUTOMATION_REGISTRY):
//   sbp-foreign-exchange-reserves : EasyData Z00020 = monthly total (~$17B) ≠
//                                   weekly net-liquid SBP (~$11B). Needs SBP
//                                   weekly HTML press-release scraper.
//   trade-balance                 : PBS customs-basis ≠ SBP BPM6 (~$470M gap).
//                                   Needs PBS scraper OR formal series relabel.

// ─── Series Publication Meta ─────────────────────────────────────────────────

export const SERIES_PUBLICATION_META: Record<string, SeriesPublicationMeta> = {
  // ── Inflation ──────────────────────────────────────────────────────────────

  "cpi-inflation-release": {
    periodValidation: { cadence: "monthly", lagMonths: 1 },
    publicationSchedule:
      "PBS releases the national CPI for month M on the 1st of month M+1 at ~14:00 PKT " +
      "(or the first weekday if the 1st falls on a weekend). " +
      "lagMonths=1: July 1 event expects June data (obsDate 2026-06-30). " +
      "Confirmed across 8 months: CPI published exactly on the 1st each month. " +
      "Data is in the PBS Monthly Inflation Report PDF — not in post HTML text. " +
      "Primary source: PBS PDF (syncCpiFromPbs.ts). Fallback: SBP EasyData.",
    officialSource: "Pakistan Bureau of Statistics",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "SBP EasyData — CPI YoY",
        type: "sbp-easydata",
        indicatorKey: "cpiInflation",
        sourceUrl: "https://www.sbp.org.pk/ecodata/index2.asp",
        implemented: true,
        note:
          "SBP EasyData receives the PBS figure same day as PBS release and is the earliest " +
          "machine-readable source. SBP publishes before the PBS website is updated in some months.",
      },
      {
        name: "PBS Monthly Inflation Report PDF",
        type: "official-pdf",
        sourceUrl: "https://www.pbs.gov.pk/",
        implemented: true,
        note:
          "Primary source. PDF attachment linked from PBS WordPress post. " +
          "Implemented Phase 7 Step 5. Published 1st of M+1 at ~14:00 PKT. " +
          "See syncCpiFromPbs.ts.",
      },
    ],
    gapDetection: {
      slugPrefix: "cpi",
      lookbackMonths: 3,
      windowDays: 7,
      expectedDayOfMonth: 1,
      eventTimeOfDay: "10:00",
      importance: "High",
      titleTemplate: "CPI Inflation Release ({month})",
    },
    notificationPriority: "high",
    cacheTagsToInvalidate: ["cpiInflation", "sbp-indicators"],
  },

  "core-inflation-release": {
    periodValidation: { cadence: "monthly", lagMonths: 1 },
    publicationSchedule:
      "PBS releases Urban NFNE core inflation alongside the headline CPI — same day, same PDF. " +
      "Published 1st of M+1 at ~14:00 PKT. lagMonths=1. " +
      "Confirmed: April core (8.0%) released May 1, May core (9.0%) released June 1. " +
      "Primary source: PBS Monthly Inflation Report PDF (syncCpiFromPbs.ts). Fallback: SBP EasyData.",
    officialSource: "Pakistan Bureau of Statistics / SBP EasyData",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "SBP EasyData — Core Inflation YoY",
        type: "sbp-easydata",
        indicatorKey: "coreInflation",
        implemented: true,
      },
      {
        name: "PBS Monthly Inflation Report PDF (NFNE table)",
        type: "official-pdf",
        sourceUrl: "https://www.pbs.gov.pk/",
        implemented: true,
        note: "NFNE Urban core inflation extracted from the same PDF as headline CPI. See syncCpiFromPbs.ts.",
      },
    ],
    gapDetection: {
      slugPrefix: "core-inflation",
      lookbackMonths: 3,
      windowDays: 7,
      expectedDayOfMonth: 1,
      eventTimeOfDay: "10:00",
      importance: "High",
      titleTemplate: "Core Inflation Release ({month})",
    },
    notificationPriority: "high",
    cacheTagsToInvalidate: ["coreInflation", "sbp-indicators"],
  },

  "spi-weekly-inflation-release": {
    periodValidation: { cadence: "weekly" },
    publicationSchedule:
      "PBS releases SPI weekly, typically on Thursday, for the week ending on the same date. " +
      "Exact-date match required: the PBS report's week-ended date must equal the calendar " +
      "event date. PBS sometimes publishes 1 day late; the sync handles this by waiting for " +
      "an exact match rather than advancing to the next slot.",
    officialSource: "Pakistan Bureau of Statistics",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "PBS SPI Weekly Report (WordPress feed)",
        type: "pbs-web",
        sourceUrl: "https://www.pbs.gov.pk/spi",
        implemented: true,
        note: "PBS publishes the SPI .xlsx file. Fetched via getSpiHistory() in src/lib/data/spi.ts.",
      },
    ],
    notificationPriority: "low",
    cacheTagsToInvalidate: ["spiHistory", "sbp-indicators"],
  },

  // ── External Sector ────────────────────────────────────────────────────────

  "current-account-balance": {
    periodValidation: { cadence: "monthly", lagMonths: 2 },
    publicationSchedule:
      "SBP publishes the monthly current account balance as part of the BPM6 BoP release, " +
      "approximately 45 days after month-end. April data (month-end April 30) is released " +
      "around mid-June (lagMonths=2: June event → April obs). Confirmed: April 2026 current " +
      "account (-$276M = -$0.28B) published ~June 15, 2026.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "SBP EasyData — BPM6 Current Account",
        type: "sbp-easydata",
        indicatorKey: "currentAccount",
        implemented: true,
        note:
          "Returns the BPM6 current account balance in billions USD. " +
          "SBP uploads EasyData typically on the same day as the BoP press release.",
      },
      {
        name: "SBP BoP Press Release PDF",
        type: "official-pdf",
        sourceUrl: "https://www.sbp.org.pk/ecodata/Balancepayment_BPM6.pdf",
        implemented: false,
        note:
          "Authoritative source. Not yet implemented — SBP EasyData is sufficient and " +
          "updates simultaneously with or before the PDF.",
      },
    ],
    gapDetection: {
      slugPrefix: "current-account",
      lookbackMonths: 4,
      windowDays: 7,
      expectedDayOfMonth: 15,
      eventTimeOfDay: "17:00",
      importance: "Medium",
      titleTemplate: "Current Account Balance ({month})",
    },
    notificationPriority: "medium",
    cacheTagsToInvalidate: ["currentAccount", "sbp-indicators"],
  },

  "worker-remittances": {
    periodValidation: { cadence: "monthly", lagMonths: 2 },
    publicationSchedule:
      "SBP publishes monthly worker remittances approximately 45–60 days after month-end, " +
      "released alongside or just before the main BoP data. lagMonths=2: July event expects " +
      "May data. Confirmed: March remittances ($3.8B) published ~May 10, April remittances " +
      "($3.53B) published ~June 10.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "SBP EasyData — Worker Remittances",
        type: "sbp-easydata",
        indicatorKey: "remittances",
        implemented: true,
      },
      {
        name: "SBP Home Remittances PDF",
        type: "official-pdf",
        sourceUrl: "https://www.sbp.org.pk/ecodata/homeremit.pdf",
        implemented: false,
        note: "SBP's monthly home remittances PDF bulletin. Not yet implemented.",
      },
    ],
    gapDetection: {
      slugPrefix: "remittances",
      lookbackMonths: 4,
      windowDays: 7,
      expectedDayOfMonth: 10,
      eventTimeOfDay: "16:00",
      importance: "Medium",
      titleTemplate: "Worker Remittances ({month})",
    },
    notificationPriority: "medium",
    cacheTagsToInvalidate: ["remittances", "sbp-indicators"],
  },

  "trade-balance": {
    // Blocker resolved Phase 7 Step 4: PBS advance release Excel scraper implemented.
    // lagMonths=1: PBS publishes M's data on ~16th–18th of M+1 (28–30 days before SBP BPM6).
    // Methodology: PBS customs-basis (FOB exports, CIF imports) — correct for PBS-labeled series.
    periodValidation: { cadence: "monthly", lagMonths: 1 },
    publicationSchedule:
      "PBS publishes advance Foreign Trade Statistics in the middle of M+1 (~16th–18th), " +
      "28–30 days before SBP BPM6. lagMonths=1: July 17 event expects June 2026 data " +
      "(obsDate 2026-06-30). Data in Revised_Summary_<Month Year>.xlsx linked from the " +
      "PBS WordPress advance release post. PBS customs-basis: FOB exports, CIF-adjusted imports. " +
      "SBP BPM6 differs by ~$470M (March 2026: PBS=-$2.84B, BPM6=-$2.37B).",
    officialSource: "Pakistan Bureau of Statistics",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "PBS Foreign Trade Statistics (advance release Excel)",
        type: "pbs-web",
        sourceUrl: "https://www.pbs.gov.pk/",
        implemented: true,
        note:
          "Correct source for PBS-labeled series. Discovered via WordPress REST API search " +
          "for 'Advance releases on Foreign Trade Statistics'. Excel file: " +
          "Revised_Summary_<Month Year>.xlsx. See syncTradeBalanceFromPbs.ts.",
      },
      {
        name: "SBP EasyData — BPM6 Goods Balance (P00050)",
        type: "sbp-easydata",
        indicatorKey: "tradeBalance",
        implemented: false,
        note:
          "WRONG METHODOLOGY for a PBS-labeled series. March 2026: PBS=-$2.84B, " +
          "BPM6=-$2.37B (~$470M gap, ~17%). Cannot be used without relabeling the series.",
      },
    ],
    gapDetection: {
      slugPrefix: "trade-balance",
      lookbackMonths: 3,
      windowDays: 7,
      expectedDayOfMonth: 17,
      eventTimeOfDay: "10:00",
      importance: "Medium",
      titleTemplate: "Trade Balance ({month})",
    },
    notificationPriority: "medium",
    cacheTagsToInvalidate: [],
  },

  "sbp-foreign-exchange-reserves": {
    // Blocker resolved Phase 7 Step 3: Forex_Arch.xlsx parser implemented.
    // Weekly exact-date match. SBP publishes Forex_Arch.xlsx same day as the press release.
    // Forex_Arch.xlsx URL: https://www.sbp.org.pk/assets/document/Forex_Arch.xlsx (stable).
    periodValidation: { cadence: "weekly" },
    publicationSchedule:
      "SBP publishes weekly net liquid FX reserves in Forex_Arch.xlsx at a stable direct URL, " +
      "updated Thursdays/Fridays for the week-ending date. Weekly cadence: exact date match " +
      "(observation week-ending date must equal the calendar event date). " +
      "Confirmed measure: net SBP liquid reserves (~$11B), NOT monthly total (~$17B). " +
      "See syncFxReservesFromSbpExcel.ts.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "SBP Forex_Arch.xlsx (weekly net SBP reserves)",
        type: "official-csv",
        sourceUrl: "https://www.sbp.org.pk/assets/document/Forex_Arch.xlsx",
        implemented: true,
        note:
          "Correct measure: weekly net SBP liquid FX reserves (~$11B). " +
          "File is 85KB, updated weekly. Parsed with xlsx library. " +
          "See syncFxReservesFromSbpExcel.ts.",
      },
      {
        name: "SBP Weekly FX Reserves Press Release (HTML table)",
        type: "sbp-web",
        sourceUrl: "https://www.sbp.org.pk/ecodata/index2.asp",
        implemented: false,
        note:
          "JavaScript-rendered page — returns 'Showing 0 records' via server-side fetch. " +
          "Not parseable without headless browser. Forex_Arch.xlsx is the correct alternative.",
      },
      {
        name: "SBP EasyData — Monthly Total Reserves (Z00020)",
        type: "sbp-easydata",
        indicatorKey: "fxReserves",
        implemented: false,
        note:
          "WRONG MEASURE: monthly total including SDR allocations (~$17B). " +
          "Calendar events show weekly net-liquid SBP reserves (~$11B). Different magnitude AND frequency.",
      },
    ],
    notificationPriority: "medium",
    cacheTagsToInvalidate: [],
  },

  "large-scale-manufacturing-lsm-growth": {
    // Blocker resolved 2026-07-01: lsmSync.ts computes YoY from EasyData history.
    // lagMonths=2: April data published ~mid-June (April 30 + 45 days ≈ June 14).
    // July 18 event (reference_period=2026-05-01) expects May 2026 data.
    periodValidation: { cadence: "monthly", lagMonths: 2 },
    publicationSchedule:
      "PBS releases LSM data approximately 45 days after month-end " +
      "(April data released ~mid-June, May data released ~mid-July). lagMonths=2. " +
      "YoY is computed from SBP EasyData's full Quantum Index history: " +
      "YoY% = (currentIndex / sameMonthPriorYearIndex − 1) × 100. " +
      "This matches PBS/SBP official methodology (Laspeyres chain-type index). " +
      "Confirmed: April 2026 index=114.56, April 2025 index=108.01 → YoY≈+6.1%.",
    officialSource: "Pakistan Bureau of Statistics / SBP EasyData",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "SBP EasyData — LSM Quantum Index (YoY derived from history)",
        type: "sbp-easydata",
        indicatorKey: "lsm",
        implemented: true,
        note:
          "Fetches full index history via getSbpIndicatorHistory('lsm'). Computes " +
          "YoY by finding the same-month observation one year earlier and applying " +
          "the standard formula. Deterministic, no AI, no estimation. " +
          "See src/lib/economicCalendar/automation/lsmSync.ts.",
      },
      {
        name: "PBS LSM Monthly Release (WordPress)",
        type: "pbs-web",
        sourceUrl: "https://www.pbs.gov.pk/",
        implemented: true,
        note:
          "Direct YoY figure from PBS HTML post body. Implemented Phase 7 Step 2. " +
          "Primary source — SBP EasyData derived YoY is the fallback. " +
          "See syncLsmFromPbs.ts.",
      },
    ],
    gapDetection: {
      slugPrefix: "lsm",
      lookbackMonths: 4,
      windowDays: 10,
      expectedDayOfMonth: 18,
      eventTimeOfDay: "10:00",
      importance: "Medium",
      titleTemplate: "Large Scale Manufacturing (LSM) Growth ({month})",
    },
    notificationPriority: "medium",
    cacheTagsToInvalidate: ["lsm", "sbp-indicators"],
  },

  // ── Monetary Policy ────────────────────────────────────────────────────────

  "sbp-monetary-policy-committee-meeting": {
    periodValidation: { cadence: "as-needed", maxDaysVariance: 3 },
    publicationSchedule:
      "SBP MPC meets 6–8 times per year per the official advance calendar published at " +
      "sbp.org.pk/m_policy/mp-calendar.asp. Decision and Monetary Policy Statement released " +
      "same day as the meeting. SBP EasyData records the policy rate on the meeting date " +
      "(occasionally 1 day later). maxDaysVariance=3 covers all known cases.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: true,
    sourceHierarchy: [
      {
        name: "SBP EasyData — Policy Rate",
        type: "sbp-easydata",
        indicatorKey: "policyRate",
        implemented: true,
        note:
          "EasyData records the policy rate on or within 1–2 days of the MPC decision. " +
          "maxDaysVariance=3 in periodValidation covers the occasional EasyData lag.",
      },
      {
        name: "SBP Monetary Policy Statement (PDF)",
        type: "official-pdf",
        sourceUrl: "https://www.sbp.org.pk/m_policy/index.asp",
        implemented: false,
        note: "Primary source. Not yet implemented — EasyData is sufficient and faster.",
      },
    ],
    notificationPriority: "critical",
    cacheTagsToInvalidate: ["policyRate", "sbp-indicators"],
  },

  "sbp-monetary-policy-report": {
    periodValidation: undefined,
    publicationSchedule:
      "SBP publishes Monetary Policy Report ~14 days after alternating MPC meetings " +
      "(the quarterly governor press-conference meetings: Jul, Oct, Jan, Apr). " +
      "Dates appear in column 6 of the MPC advance calendar table.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: true,
    sourceHierarchy: [
      {
        name: "SBP Monetary Policy Report (PDF)",
        type: "official-pdf",
        sourceUrl: "https://www.sbp.org.pk/m_policy/index.asp",
        implemented: false,
        note: "PDF report — no numeric actual_value, only the release date is tracked.",
      },
    ],
    notificationPriority: "low",
    cacheTagsToInvalidate: [],
  },

  // ── Financial Markets ──────────────────────────────────────────────────────

  "treasury-bill-auction-3m": {
    periodValidation: { cadence: "as-needed", maxDaysVariance: 3 },
    publicationSchedule:
      "SBP DMMD holds MTB auctions approximately fortnightly (bi-weekly, typically Wednesdays). " +
      "Official auction target calendar published at sbp.org.pk/ecodata/auction-treasurybills.pdf. " +
      "Cut-off yield recorded in SBP EasyData (TS_GP_BAM_SIRTBIL_AH.TB0040) on auction date. " +
      "maxDaysVariance=3 covers EasyData recording the result 1–2 days after the auction date.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: true,
    sourceHierarchy: [
      {
        name: "SBP EasyData — 3M T-Bill Cut-Off Yield (TB0040)",
        type: "sbp-easydata",
        indicatorKey: "tbillYield3m",
        implemented: true,
      },
      {
        name: "SBP MTB Auction Results PDF",
        type: "official-pdf",
        sourceUrl: "https://www.sbp.org.pk/ecodata/auction-tbills.pdf",
        implemented: false,
        note:
          "Authoritative source for cross-verification of historical auctions. " +
          "Needed for backfill of Apr 29, May 13, May 20 auctions (see PENDING_AUTOMATION_REGISTRY).",
      },
    ],
    notificationPriority: "medium",
    cacheTagsToInvalidate: ["tbillYield3m", "sbp-indicators"],
  },

  "treasury-bill-auction-6m": {
    periodValidation: { cadence: "as-needed", maxDaysVariance: 3 },
    publicationSchedule:
      "Same auction event as 3M, run simultaneously. 6M cut-off yield from same SBP EasyData " +
      "auction results. Official calendar at sbp.org.pk/ecodata/auction-treasurybills.pdf.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: true,
    sourceHierarchy: [
      {
        name: "SBP EasyData — 6M T-Bill Cut-Off Yield",
        type: "sbp-easydata",
        indicatorKey: "tbillYield6m",
        implemented: false,
        note: "Indicator key not yet confirmed in SBP EasyData. Listed for future automation.",
      },
    ],
    notificationPriority: "low",
    cacheTagsToInvalidate: [],
  },

  "treasury-bill-auction-12m": {
    periodValidation: { cadence: "as-needed", maxDaysVariance: 3 },
    publicationSchedule:
      "Same auction event as 3M/6M, run simultaneously. 12M cut-off yield from same SBP " +
      "EasyData auction results. Official calendar at sbp.org.pk/ecodata/auction-treasurybills.pdf.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: true,
    sourceHierarchy: [
      {
        name: "SBP EasyData — 12M T-Bill Cut-Off Yield",
        type: "sbp-easydata",
        indicatorKey: "tbillYield12m",
        implemented: false,
        note: "Indicator key not yet confirmed in SBP EasyData. Listed for future automation.",
      },
    ],
    notificationPriority: "low",
    cacheTagsToInvalidate: [],
  },

  "treasury-bill-auction": {
    periodValidation: { cadence: "as-needed", maxDaysVariance: 3 },
    publicationSchedule:
      "Legacy generic T-bill series pre-dating the 3M/6M/12M split (migration 0013). " +
      "Superseded by treasury-bill-auction-3m/6m/12m. " +
      "Same fortnightly schedule; same official calendar PDF.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: true,
    sourceHierarchy: [
      {
        name: "SBP EasyData — 3M T-Bill Cut-Off Yield (TB0040)",
        type: "sbp-easydata",
        indicatorKey: "tbillYield3m",
        implemented: true,
        note: "Legacy series — now superseded by treasury-bill-auction-3m.",
      },
    ],
    notificationPriority: "medium",
    cacheTagsToInvalidate: ["tbillYield3m", "sbp-indicators"],
  },

  "pib-auction": {
    periodValidation: { cadence: "as-needed", maxDaysVariance: 3 },
    publicationSchedule:
      "SBP holds Fixed-Rate PIB auctions approximately monthly. Official calendar at " +
      "sbp.org.pk/ecodata/auction-bond.pdf. 3Y cut-off yield from SBP EasyData " +
      "(TS_GP_BAM_SIRPIBS_AH.PIB0080) on auction date. maxDaysVariance=3 covers " +
      "result recording timing.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: true,
    sourceHierarchy: [
      {
        name: "SBP EasyData — PIB 3Y Cut-Off Yield (PIB0080)",
        type: "sbp-easydata",
        indicatorKey: "pibYield3y",
        implemented: true,
      },
      {
        name: "SBP PIB Auction Results PDF",
        type: "official-pdf",
        sourceUrl: "https://www.sbp.org.pk/ecodata/Pakinvestbonds.pdf",
        implemented: false,
        note:
          "Authoritative source. Needed for backfill of May 18 and April 29 auctions " +
          "(see PENDING_AUTOMATION_REGISTRY).",
      },
    ],
    notificationPriority: "medium",
    cacheTagsToInvalidate: ["pibYield3y", "sbp-indicators"],
  },

  // ── Real Economy ───────────────────────────────────────────────────────────

  "gdp-growth-release": {
    periodValidation: undefined,
    publicationSchedule:
      "PBS releases the provisional annual GDP growth estimate for fiscal year FY (July–June) " +
      "approximately in August of the same calendar year. Advance Release Calendar of National " +
      "Accounts exists in principle but stable URL has not been confirmed — GDP remains manual.",
    officialSource: "Pakistan Bureau of Statistics",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "PBS National Accounts (GDP press release)",
        type: "pbs-web",
        sourceUrl: "https://www.pbs.gov.pk/national-accounts-2/",
        implemented: false,
        note: "Annual provisional GDP estimate. Manual entry from PBS press release.",
      },
    ],
    notificationPriority: "critical",
    cacheTagsToInvalidate: [],
  },

  // ── Fiscal Sector ──────────────────────────────────────────────────────────

  "federal-budget": {
    periodValidation: undefined,
    publicationSchedule:
      "Presented by Finance Minister in the National Assembly annually, " +
      "typically the first or second week of June.",
    officialSource: "Ministry of Finance",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "Ministry of Finance (finance.gov.pk)",
        type: "manual",
        implemented: false,
        note: "Annual event. Manual entry only.",
      },
    ],
    notificationPriority: "critical",
    cacheTagsToInvalidate: [],
  },

  "pakistan-economic-survey": {
    periodValidation: undefined,
    publicationSchedule:
      "Ministry of Finance releases annually the day before the Federal Budget presentation, " +
      "typically the first or second week of June.",
    officialSource: "Ministry of Finance",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "Ministry of Finance (finance.gov.pk)",
        type: "manual",
        implemented: false,
        note: "Annual event. Manual entry only.",
      },
    ],
    notificationPriority: "high",
    cacheTagsToInvalidate: [],
  },

  "government-debt-release": {
    periodValidation: undefined,
    publicationSchedule:
      "SBP releases quarterly government debt (domestic + external) approximately 3–4 months " +
      "after the quarter-end. Q3 FY26 (Jan–Mar 2026) was released in late April 2026.",
    officialSource: "State Bank of Pakistan",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "SBP Quarterly Debt Statistics PDF",
        type: "official-pdf",
        sourceUrl: "https://www.sbp.org.pk/ecodata/index2.asp",
        implemented: false,
        note: "Quarterly. Not yet automated.",
      },
    ],
    notificationPriority: "high",
    cacheTagsToInvalidate: [],
  },

  // ── Financial Markets (non-automated) ─────────────────────────────────────

  "kse-100-weekly-market-review": {
    periodValidation: undefined,
    publicationSchedule:
      "Weekly KSE-100 market summary, end of Friday trading session. " +
      "No lag — market data is same-day. Not automated (no single machine-readable source).",
    officialSource: "Pakistan Stock Exchange",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "PSX (psx.com.pk)",
        type: "manual",
        implemented: false,
      },
    ],
    notificationPriority: "low",
    cacheTagsToInvalidate: [],
  },

  "psx-holiday-calendar": {
    periodValidation: undefined,
    publicationSchedule:
      "PSX publishes the annual trading holiday list at the start of each calendar year.",
    officialSource: "Pakistan Stock Exchange",
    advanceCalendarAvailable: false,
    sourceHierarchy: [
      {
        name: "PSX Annual Holiday Calendar",
        type: "manual",
        implemented: false,
      },
    ],
    notificationPriority: "low",
    cacheTagsToInvalidate: [],
  },
};

// ─── Pending Automation Registry ──────────────────────────────────────────────
//
// Every series whose automation is currently blocked must have an entry here.
// "Removing from automation" is never the right call — document the blocker
// instead so the next maintainer can resolve it without re-deriving the issue.
// Entries are ordered by priority (P1 → P3), then by estimated complexity.

export const PENDING_AUTOMATION_REGISTRY: readonly PendingAutomationEntry[] = [
  // ── P1-Critical ────────────────────────────────────────────────────────────

  // trade-balance: RESOLVED Phase 7 Step 4 (2026-07-02).
  // syncTradeBalanceFromPbs.ts — PBS advance release Excel (customs-basis).
  // periodValidation: { cadence: "monthly", lagMonths: 1 }.

  // sbp-foreign-exchange-reserves: RESOLVED Phase 7 Step 3 (2026-07-02).
  // syncFxReservesFromSbpExcel.ts — SBP Forex_Arch.xlsx (weekly net SBP reserves).
  // periodValidation: { cadence: "weekly" } (exact date match).

  // ── P2-High (remaining) ────────────────────────────────────────────────────
  // LSM YoY resolved 2026-07-01 — moved to SERIES_PUBLICATION_META with implemented=true.
  // lsmSync.ts computes YoY from getSbpIndicatorHistory('lsm') full index history.
  // Keeping a stub here for historical reference; remove in next quarterly cleanup.
  // {
  //   seriesSlug: "large-scale-manufacturing-lsm-growth",
  //   RESOLVED: lsmSync.ts implemented Option A (YoY from full index history).
  //   See src/lib/economicCalendar/automation/lsmSync.ts.
  // },

  // ── P3-Medium ──────────────────────────────────────────────────────────────

  {
    seriesSlug: "treasury-bill-auction-3m",
    indicator: "Treasury Bill Auction (3M) — historical backfill (Apr–May 2026)",
    currentStatus: "semi-automated",
    automationBlocker:
      "Four missing auctions between April 16 and July 8, 2026 could not be independently " +
      "verified from public sources. " +
      "Apr 28 (Tuesday): removed — SBP T-bill auctions are held on Wednesdays; a Tuesday " +
      "date is non-standard and the SBP EasyData entry may reflect a settlement date. " +
      "Apr 29, May 13, May 20: yields from SBP EasyData (TS_GP_BAM_SIRTBIL_AH.TB0040) are " +
      "directionally consistent (post-MPC hike: rates rising ~11.25% to ~12.31%) but could " +
      "not be cross-confirmed against SBP's published MTB auction results PDF.",
    requiredSource:
      "SBP 'Market Treasury Bills (MTBs) Auction Result' PDF at " +
      "sbp.org.pk/ecodata/auction-tbills.pdf, or the DMMD auction results archive. " +
      "Historical auction results table shows cut-off yields by date.",
    plannedMethod:
      "Fetch SBP's MTB auction results PDF, extract cut-off yields for April 29, May 13, " +
      "and May 20, 2026. If confirmed, insert as released/confirmed via a follow-up migration. " +
      "Verify Apr 29 against whether a PIB auction also ran that day.",
    priority: "P3-medium",
    estimatedComplexity: "low",
    blockedBy: [],
    addedDate: "2026-07-01",
  },
  {
    seriesSlug: "pib-auction",
    indicator: "PIB Auction — May 18 and April 29, 2026",
    currentStatus: "semi-automated",
    automationBlocker:
      "PIB Fixed-Rate auction on May 18, 2026 (yield ~13.25%) sourced from SBP EasyData " +
      "but cut-off yield not confirmed against SBP's published PIB auction results. " +
      "Additionally: web sources confirm a PIB auction was held on April 29, 2026 (day after " +
      "MPC's surprise +100bps hike on April 27), at which the government rejected high-yield " +
      "bids and raised Rs512B. This event is missing from the calendar entirely.",
    requiredSource:
      "SBP 'Pakistan Investment Bonds' auction results at sbp.org.pk/ecodata/Pakinvestbonds.pdf " +
      "or the DMMD PIB results archive. Verify: (a) May 18 fixed-rate 3Y cut-off yield, " +
      "(b) April 29 fixed-rate results (government may have rejected all bids).",
    plannedMethod:
      "Fetch SBP PIB results PDF, confirm April 29 and May 18 cut-off yields. " +
      "If April 29 bids were rejected, insert as released with actual_value noting the " +
      "rejection outcome. Insert via follow-up migration (0024 or similar).",
    priority: "P3-medium",
    estimatedComplexity: "low",
    blockedBy: ["treasury-bill-auction-3m"],
    addedDate: "2026-07-01",
  },
];
