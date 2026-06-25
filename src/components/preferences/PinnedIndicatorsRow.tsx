"use client";

// Shows a signed-in user's pinned widgets as a quick-jump row, in the
// exact order they arranged on /settings/preferences. Renders nothing for
// guests, for a user with zero pins, or while preferences are still
// loading — there's no "starter" or placeholder content to avoid ever
// fabricating a personalization that hasn't actually happened yet.

import Link from "next/link";
import { usePreferences } from "@/components/PreferencesProvider";
import { getWidgetLabel } from "@/lib/dashboardWidgets";

export default function PinnedIndicatorsRow() {
  const { preferences, loading } = usePreferences();
  const pinned = preferences?.favoriteIndicators ?? [];

  if (loading || pinned.length === 0) return null;

  return (
    <section className="mt-6" data-cta-source="pinned-indicators">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-white/40 light:text-slate-500">
        Pinned for You
      </h2>
      <div className="flex flex-wrap gap-2">
        {pinned.map((id) => (
          <Link
            key={id}
            href={`/#${id}`}
            className="glass-card rounded-full border border-neon-blue/25 bg-neon-blue/10 px-3.5 py-1.5 text-xs font-medium text-neon-blue transition-colors hover:bg-neon-blue/20"
          >
            ★ {getWidgetLabel(id)}
          </Link>
        ))}
      </div>
    </section>
  );
}
