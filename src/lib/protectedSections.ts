// Single source of truth for "which sections require a signed-in user" —
// consumed by src/proxy.ts (server-side enforcement), Sidebar.tsx (desktop
// click-interception), MobileNav.tsx (mobile drawer interception),
// ProvincialQuickAccess.tsx (homepage province cards), and ProtectedLink.tsx
// (the reusable wrapper used for cross-links into these sections from
// otherwise-public pages — back-to-hub links, "Related" sections, etc.), so
// none of them can silently drift out of sync with each other.
//
// Premium Access Restoration (post SEO Phase A/B): Phase A removed
// Comparisons/Budget/Provincial Budget from route-level protection entirely
// so Googlebot could crawl the ~50 informational detail pages built under
// them. That correctly freed the detail pages, but it also left the actual
// premium TOOLS — the interactive hub/workspace pages themselves — reachable
// by anyone, which was never the intent. The fix is not a rollback to the
// pre-Phase-A blanket prefix match (that would re-protect the detail pages
// too, undoing the SEO work) — it's protecting exactly the tool pages by
// their own exact path, while every detail/SEO page stays public.
//
// PROTECTED_SECTIONS: prefix-matched (startsWith) — /settings/preferences
// must match "/settings" despite not being an exact equal, since account
// pages can grow new sub-routes without each one needing its own entry here.
//
// /economic-calendar joined this list (rather than PROTECTED_EXACT_PATHS)
// deliberately: unlike Comparisons/Budget/Provincial Budget below, where
// only the hub is gated and the informational detail pages underneath stay
// public for SEO, the whole Economic Calendar surface — hub, archive list,
// every /event/[slug] and /archive/[slug] detail page, and the .ics feed
// routes — is now premium. Prefix-matching gives that "everything under
// this path" behavior from one entry instead of enumerating every dynamic
// slug, which isn't possible here anyway.
//
// PROTECTED_EXACT_PATHS: exact-matched only, deliberately NOT prefix-matched
// — these are leaf "tool" pages whose siblings/children (the 16 comparison
// detail pages under /comparisons, the 8 budget category pages under
// /budget, the 15 other provincial SEO pages under /provincial-budget) must
// stay public. Prefix-matching any of these would silently re-protect that
// public content.
export const PROTECTED_SECTIONS = ["/settings", "/economic-calendar"];

export const PROTECTED_EXACT_PATHS = [
  "/comparisons",
  "/budget",
  "/provincial-budget",
  "/provincial-budget/compare",
  "/provincial-budget/punjab",
  "/provincial-budget/sindh",
  "/provincial-budget/kp",
  "/provincial-budget/balochistan",
  "/provincial-budget/rankings",
];

export function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_EXACT_PATHS.includes(pathname)) return true;
  return PROTECTED_SECTIONS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
