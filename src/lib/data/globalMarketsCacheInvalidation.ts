// Deliberately separate from the fetcher modules (metals.ts/fred.ts) — same
// reason as sbpCacheInvalidation.ts: this needs revalidateTag() from
// "next/cache", which Next.js refuses to bundle into any client-reachable
// module, and keeping it isolated here means the fetcher modules stay safe
// to import from anywhere.

import { revalidateTag } from "next/cache";
import { globalMarketCacheTag, type GlobalMarketSymbolKey } from "@/lib/data/globalMarketsCacheTags";

/** Busts the Next.js Data Cache entry for a single Global Markets symbol so the next fetch (on any instance) re-hits its upstream source rather than serving a value the freshness audit just found to be behind. */
export function invalidateGlobalMarketCache(key: GlobalMarketSymbolKey): void {
  revalidateTag(globalMarketCacheTag(key), "max");
}

/** FX rates share a single cache tag across all four cross-pairs (fxRates.ts) — busting one busts all four, matching /api/revalidate-fx's existing behavior. */
export function invalidateFxRatesCache(): void {
  revalidateTag("fx-rates", "max");
}
