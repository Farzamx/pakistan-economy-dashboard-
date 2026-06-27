// Single source of truth for "which sections require a signed-in user" —
// consumed by src/proxy.ts (server-side enforcement), Sidebar.tsx (desktop
// click-interception), MobileNav.tsx (mobile drawer interception), and
// ProvincialQuickAccess.tsx (homepage province cards), so none of them can
// silently drift out of sync with each other.
//
// SEO Architecture Migration (Phase A): Comparisons, Budget, and Provincial
// Budget used to be protected as whole sections. An SEO audit found this
// meant Googlebot was redirected to a noindex'd /login page on every one of
// ~50 URLs deliberately built with search-intent titles and submitted via
// sitemap.ts — confirmed live (Googlebot UA received the same 307 a regular
// browser does, landing on /login with no access to the real page's title,
// content, or structured data). Only /settings has no public-facing value
// to lose, so it's the only section still gated at the route level.
export const PROTECTED_SECTIONS = ["/settings"];

// Routes whose BASE content is deliberately public (so they're correctly
// absent from PROTECTED_SECTIONS above) but that are expected to grow
// premium-only functionality later — saved/custom comparisons, exports,
// watchlists, personalization. When that functionality exists, the
// components implementing it must gate themselves via useAuth() directly;
// this list has no runtime effect today and nothing currently reads it —
// it exists so that work doesn't have to re-derive this exact set of
// routes from scratch. /comparisons/[slug], /budget/[slug], and
// /provincial-budget's 16 SEO sub-pages are deliberately NOT here: their
// entire value is the informational content itself, with no premium layer
// ever planned on top, so they're fully public with nothing to gate.
export const HYBRID_SECTIONS = [
  "/comparisons",
  "/budget",
  "/provincial-budget",
  "/provincial-budget/compare",
  "/provincial-budget/punjab",
  "/provincial-budget/sindh",
  "/provincial-budget/kp",
  "/provincial-budget/balochistan",
];

// Prefix-aware (startsWith), not exact-match — /settings/preferences must
// match the "/settings" entry above despite not being an exact equal.
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_SECTIONS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
