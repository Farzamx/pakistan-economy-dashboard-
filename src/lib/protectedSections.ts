// "Which sections require a signed-in user" — the answer now lives in ONE place, src/lib/accessPolicy.ts (G.20). This module keeps the name the original
// consumers import (Sidebar-era components, the shell's useGuestGate, ProtectedLink, GlobalSearch, MobileNav, ProvincialQuickAccess, the Decision Lab tool
// cards) and simply asks the policy, so none of them can drift from src/proxy.ts's server-side enforcement.
//
// At commit 04acfd4 this file held a short list (Comparisons, Budget and Provincial Budget hubs, the Economic Calendar, the Decision Lab calculators and
// Settings); everything else was public. The owner's policy is now the opposite default: every page needs a sign-in except the Overview, the landing page
// and the sign-in pages themselves. See docs/access-policy.md.

import { requiresLogin } from "@/lib/accessPolicy";

/** True when a signed-out visitor following this path must sign in first. Accepts a path or an internal href (query and fragment are ignored). */
export function isProtectedPath(pathname: string): boolean {
  return requiresLogin(pathname);
}
