"use client";

// Shows a quick-jump row of dashboard widgets. Real personalization (a
// signed-in user's own pins, in the exact order arranged on
// /settings/preferences) renders identically on every breakpoint, same as
// always. Phase M1 addition: when there are zero real pins — the common
// case for a guest or a first-time mobile visitor, since `preferences` is
// `null` for guests (see PreferencesProvider.tsx) and both cases collapse
// to the same empty array — a small fixed default set renders instead,
// but ONLY on mobile (`min-[800px]:hidden`), so desktop's existing
// "render nothing until the user actually pins something" behavior is
// completely unchanged (no fabricated personalization is claimed, it's
// visually distinct from the real-pins row via the absence of the ★
// prefix and no border/fill treatment).

import Link from "next/link";
import { usePreferences } from "@/components/PreferencesProvider";
import { getWidgetLabel } from "@/lib/dashboardWidgets";
import { useLanguage } from "@/components/LanguageProvider";

const DEFAULT_MOBILE_INDICATORS = ["gdp", "inflation", "exchange-rate", "reserves", "monetary-policy"];

export default function PinnedIndicatorsRow() {
  const { preferences, loading } = usePreferences();
  const { t } = useLanguage();
  const pinned = preferences?.favoriteIndicators ?? [];

  if (loading) return null;

  if (pinned.length === 0) {
    return (
      <section className="mt-6 min-[800px]:hidden" data-cta-source="pinned-indicators-default">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-white/40 light:text-slate-500">{t("pinnedIndicators.title")}</h2>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_MOBILE_INDICATORS.map((id) => (
            <Link key={id} href={`/#${id}`} className="glass-card rounded-full border border-white/10 light:border-slate-200 px-3.5 py-1.5 text-xs font-medium text-white/70 light:text-slate-600 transition-colors hover:border-neon-blue/40">
              {getWidgetLabel(id)}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6" data-cta-source="pinned-indicators">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-white/40 light:text-slate-500">
        {t("pinnedIndicators.title")}
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
