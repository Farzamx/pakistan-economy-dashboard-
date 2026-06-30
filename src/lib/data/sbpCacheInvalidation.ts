// Deliberately separate from sbp.ts (Production Audit Part 5's push-based
// invalidation) — this needs revalidateTag() from "next/cache", which
// Next.js refuses to bundle into any client-reachable module. sbp.ts is
// imported by comparisonData.ts -> ComparisonWorkspace.tsx (a Client
// Component), so putting this here instead keeps that import chain free
// of a server-only API and the production build working. Only ever
// imported from the calendar-sync cron route (server-only), never from
// anything client-reachable.

import { revalidateTag } from "next/cache";
import { invalidate } from "@/lib/memoryCache";
import { sbpCacheTag, type SbpIndicatorKey } from "@/lib/data/sbp";

/**
 * Called by the daily calendar-sync cron right after it successfully writes
 * a fresh observation for `key` to Supabase — clears this instance's L1
 * entry and busts the L2 Next.js Data Cache tag, so the next request (on
 * any instance) re-fetches from SBP EasyData rather than serving a value
 * older than what the cron just confirmed. L1's own TTL (10 min) already
 * bounds the worst case even without this — see dataQuality.ts's header
 * for why no further cross-instance invalidation is needed.
 */
export function invalidateSbpIndicatorCache(key: SbpIndicatorKey): void {
  invalidate(`sbp-indicator:${key}`);
  revalidateTag(sbpCacheTag(key), "max");
}
