import type { EventCategory, ImportanceLevel, EventStatus } from "./economicCalendarTypes";

export interface CategoryMeta {
  label: EventCategory;
  description: string;
  /** Tailwind color name used to derive border/bg/text utility classes consistently. */
  color: "purple" | "blue" | "emerald" | "amber" | "rose" | "cyan" | "violet";
  hex: string;
}

export const EVENT_CATEGORIES: Record<EventCategory, CategoryMeta> = {
  Inflation: {
    label: "Inflation",
    description: "CPI, core inflation, and SPI weekly releases that show how fast prices are rising in Pakistan.",
    color: "purple",
    hex: "#a855f7",
  },
  "Monetary Policy": {
    label: "Monetary Policy",
    description: "SBP policy rate decisions and the Monetary Policy Committee meetings that set them.",
    color: "blue",
    hex: "#38bdf8",
  },
  "External Sector": {
    label: "External Sector",
    description: "Foreign exchange reserves, the trade balance, current account, and remittances.",
    color: "emerald",
    hex: "#34d399",
  },
  "Fiscal Sector": {
    label: "Fiscal Sector",
    description: "The federal budget, the Economic Survey, T-Bill/PIB auctions, and government debt releases.",
    color: "amber",
    hex: "#f59e0b",
  },
  "Real Economy": {
    label: "Real Economy",
    description: "GDP growth and Large Scale Manufacturing (LSM) — output releases measuring the size of the economy.",
    color: "rose",
    hex: "#fb7185",
  },
  "Financial Markets": {
    label: "Financial Markets",
    description: "PSX/KSE-100 reviews, holiday calendar, and other market-facing data points.",
    color: "cyan",
    hex: "#22d3ee",
  },
  "Global Events": {
    label: "Global Events",
    description: "Pakistan-specific international events — IMF program reviews and disbursements that directly affect Pakistan's reserves and bond market. Not a general international calendar.",
    color: "violet",
    hex: "#818cf8",
  },
};

export const EVENT_CATEGORY_LIST: EventCategory[] = Object.keys(EVENT_CATEGORIES) as EventCategory[];

export interface ImportanceMeta {
  label: ImportanceLevel;
  /** Full user-facing label — "{label} Market Impact", used everywhere this renders as a badge. */
  displayLabel: string;
  badgeClass: string;
  dotClass: string;
}

/**
 * Market Impact classification (renamed from generic "Importance" in
 * Phase 2B — see EventImportanceBadge's tooltip for the exact wording
 * shown to users). Classifications follow the user-specified mapping:
 * High = SBP MPC, CPI, GDP, Federal Budget, major debt releases; Medium =
 * Trade Balance, Current Account, Remittances, FX Reserves, T-Bill/PIB
 * auctions; Low = SPI weekly, routine market reviews. Assigned per-series
 * in scripts/generateEconomicCalendarSeed.ts's SERIES_META, not here — this
 * is just the level metadata (color, label), not the classification rules.
 */
export const IMPORTANCE_LEVELS: Record<ImportanceLevel, ImportanceMeta> = {
  High: {
    label: "High",
    displayLabel: "High Market Impact",
    badgeClass: "border-rose-400/30 bg-rose-400/10 text-rose-400",
    dotClass: "bg-rose-400",
  },
  Medium: {
    label: "Medium",
    displayLabel: "Medium Market Impact",
    badgeClass: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    dotClass: "bg-amber-400",
  },
  Low: {
    label: "Low",
    displayLabel: "Low Market Impact",
    badgeClass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
    dotClass: "bg-emerald-400",
  },
};

export const IMPORTANCE_LEVEL_LIST: ImportanceLevel[] = ["High", "Medium", "Low"];

export const MARKET_IMPACT_TOOLTIP =
  "Market Impact estimates the potential effect of this release on PSX, investor sentiment, bond yields, and the Pakistani Rupee.";

/** Border/bg/text utility classes for a category badge — Tailwind needs literal class strings, so this can't be templated from CategoryMeta.color at runtime. */
export const CATEGORY_BADGE_CLASS: Record<CategoryMeta["color"], string> = {
  purple: "border-neon-purple/30 bg-neon-purple/10 text-neon-purple",
  blue: "border-neon-blue/30 bg-neon-blue/10 text-neon-blue",
  emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-400",
  cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-400",
  violet: "border-violet-400/30 bg-violet-400/10 text-violet-400",
};

export interface StatusMeta {
  label: string;
  badgeClass: string;
}

/** Upcoming=Gray, Released=Green, Postponed=Orange, Cancelled=Red, per the Phase 2B spec. */
export const EVENT_STATUS_META: Record<EventStatus, StatusMeta> = {
  scheduled: { label: "Upcoming", badgeClass: "border-white/20 bg-white/5 text-white/60 light:border-slate-300 light:bg-slate-100 light:text-slate-600" },
  released: { label: "Released", badgeClass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400" },
  postponed: { label: "Postponed", badgeClass: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
  cancelled: { label: "Cancelled", badgeClass: "border-rose-400/30 bg-rose-400/10 text-rose-400" },
};

/**
 * Automation-coverage badge (production-hardening audit, 2026-07-18):
 * economic_event_series.automation_tier was already fetched from the DB but
 * never rendered anywhere, so a manually-entered series (e.g. Federal Budget,
 * PSX Holiday Calendar) looked identical to a fully automated one (e.g. CPI).
 * "automated" renders no badge at all (the expected, majority case — adding
 * a badge there would just be noise). "semi_automated"/"manual" render a
 * visible amber badge so users never assume a release is machine-verified
 * when it isn't. Unrecognized/missing tier values are treated as "manual"
 * (fail safe toward disclosure, never toward silently implying automation).
 */
export interface AutomationTierMeta {
  label: string;
  badgeClass: string;
}

export const AUTOMATION_TIER_META: Record<"semi_automated" | "manual", AutomationTierMeta> = {
  semi_automated: { label: "Partial Automation", badgeClass: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
  manual: { label: "Manual Update Required", badgeClass: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
};
