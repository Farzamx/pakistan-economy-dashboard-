"use client";

// Wraps one homepage section so a signed-in user's "Hidden" preference can
// suppress it. Deliberately does NOT make page.tsx itself read preferences
// server-side — that would force the entire homepage off ISR/shared-cache
// rendering into per-user dynamic rendering for every visitor, including
// the anonymous majority who have no preferences at all. Instead, the
// Server Component tree renders exactly as before (same shared, cached
// HTML for everyone) and this client wrapper — already a leaf in that
// tree, receiving the already-rendered section as `children` — decides
// post-hoc whether to mount it, using the client-fetched PreferencesProvider
// state. A signed-out visitor (or one whose preferences haven't loaded
// yet) always sees every section; nothing is ever hidden before
// `usePreferences()` resolves.

import type { ReactNode } from "react";
import { usePreferences } from "@/components/PreferencesProvider";

export default function HideableSection({ id, children }: { id: string; children: ReactNode }) {
  const { preferences } = usePreferences();
  if (preferences?.dashboardLayout.hidden.includes(id)) return null;
  return <>{children}</>;
}
