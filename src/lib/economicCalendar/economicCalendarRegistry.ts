import type { EventCategory, ImportanceLevel } from "./economicCalendarTypes";

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
    description: "CPI, SPI, and food/core inflation releases that show how fast prices are rising.",
    color: "purple",
    hex: "#a855f7",
  },
  "Monetary Policy": {
    label: "Monetary Policy",
    description: "SBP policy rate decisions and the meetings that set them.",
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
    description: "The federal budget, the Economic Survey, and other government fiscal releases.",
    color: "amber",
    hex: "#f59e0b",
  },
  "Real Economy": {
    label: "Real Economy",
    description: "GDP growth and other output releases measuring the size of the economy.",
    color: "rose",
    hex: "#fb7185",
  },
  "Financial Markets": {
    label: "Financial Markets",
    description: "PSX/KSE-100 reviews and other market-facing data points.",
    color: "cyan",
    hex: "#22d3ee",
  },
  "Global Events": {
    label: "Global Events",
    description: "Foreign central bank decisions and global releases that spill over into Pakistan's markets.",
    color: "violet",
    hex: "#818cf8",
  },
};

export const EVENT_CATEGORY_LIST: EventCategory[] = Object.keys(EVENT_CATEGORIES) as EventCategory[];

export interface ImportanceMeta {
  label: ImportanceLevel;
  badgeClass: string;
  dotClass: string;
}

export const IMPORTANCE_LEVELS: Record<ImportanceLevel, ImportanceMeta> = {
  High: {
    label: "High",
    badgeClass: "border-rose-400/30 bg-rose-400/10 text-rose-400",
    dotClass: "bg-rose-400",
  },
  Medium: {
    label: "Medium",
    badgeClass: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    dotClass: "bg-amber-400",
  },
  Low: {
    label: "Low",
    badgeClass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
    dotClass: "bg-emerald-400",
  },
};

export const IMPORTANCE_LEVEL_LIST: ImportanceLevel[] = ["High", "Medium", "Low"];

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
