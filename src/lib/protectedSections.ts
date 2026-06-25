// Single source of truth for "which sections require a signed-in user" —
// consumed by src/proxy.ts (server-side enforcement), Sidebar.tsx (desktop
// click-interception), and MobileNav.tsx (mobile drawer interception), so
// the three can't silently drift out of sync with each other.
//
// Prefix-aware (startsWith), not exact-match: the desktop Sidebar's
// original check only compared hrefs for exact equality, which happened to
// work because every desktop link pointed at a section's root path. The
// mobile drawer adds a "Rankings" link to /provincial-budget/rankings — an
// exact-match check would silently let that one navigate without ever
// showing the GuestAccessModal, since "/provincial-budget/rankings" !==
// "/provincial-budget". proxy.ts already needed prefix matching for the
// same reason (dynamic [slug] sub-pages); this just shares that logic.

export const PROTECTED_SECTIONS = ["/comparisons", "/budget", "/provincial-budget", "/settings"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_SECTIONS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
