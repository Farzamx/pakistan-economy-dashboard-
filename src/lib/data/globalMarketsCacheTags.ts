// Central registry of Next.js Data Cache tags for the 8 Global Markets
// indicators that previously had none (gold/silver/dxy via metals.ts;
// wti/brent/natural-gas/us10y/fed-funds via fred.ts — see the freshness
// audit's root-cause notes). Without a tag, revalidateTag() has nothing to
// target, so a drifted indicator could only ever self-correct by waiting
// out its own revalidate window — this registry is what lets
// globalMarketsFreshnessAudit.ts force a targeted refresh of exactly the
// symbol that drifted, the same way sbpCacheTag()/sbpCacheInvalidation.ts
// already does for SBP EasyData series.
//
// FX (USD/EUR/GBP/SAR-PKR) already has its own "fx-rates" tag (fxRates.ts)
// covering all four at once and is deliberately not duplicated here.

export const GLOBAL_MARKET_SYMBOL_KEYS = [
  "gold",
  "silver",
  "wti",
  "brent",
  "natural-gas",
  "dxy",
  "us10y",
  "fed-funds",
] as const;

export type GlobalMarketSymbolKey = (typeof GLOBAL_MARKET_SYMBOL_KEYS)[number];

export function globalMarketCacheTag(key: GlobalMarketSymbolKey): string {
  return `gm-${key}`;
}
