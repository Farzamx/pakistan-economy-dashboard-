"use client";

// Hero-section auth entry point (Auth UX Enhancement) — the homepage's
// signup/login CTAs and "Access your dashboard" message for the rare
// returning visitor who is already signed in. Kept as its own component
// (not inlined into Hero.tsx) specifically so a future analytics pass has
// one obvious file to instrument; data-cta-source="hero" tags every click
// target below for that same reason, with no tracking call wired up yet.

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

export default function HeroAuthCta() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const benefits = [t("hero.benefitComparisons"), t("hero.benefitBudget"), t("hero.benefitProvincial"), t("hero.benefitPremium")];

  // Suppressed entirely while the initial session check is in flight —
  // same convention as Sidebar/MobileNav — to avoid a flash of the wrong
  // state (signup pitch vs. welcome message) on every page load.
  if (loading) return null;

  if (user) {
    // Account management (Logout, Member badge) lives in the Sidebar's
    // member card now — duplicating it here was the exact clutter the
    // Auth UI Cleanup pass removed. The Hero's job is promoting the
    // product, not account controls, so authenticated visitors just get a
    // lightweight acknowledgment.
    return (
      <p className="mt-4 text-sm text-white/70 light:text-slate-600" data-cta-source="hero">
        {t("hero.welcomeBack")} <span className="font-semibold text-white light:text-slate-900">{user.email}</span>
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3" data-cta-source="hero">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/signup"
          data-cta="signup"
          data-cta-source="hero"
          className="rounded-md bg-neon-blue px-5 py-2.5 text-sm font-semibold text-[#05060f] transition-colors hover:bg-neon-blue/90 light:text-white"
        >
          {t("hero.createAccount")}
        </Link>
        <Link
          href="/login"
          data-cta="login"
          data-cta-source="hero"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          {t("hero.login")}
        </Link>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
        {benefits.map((b) => (
          <li key={b} className="flex items-center gap-1.5 text-xs text-white/50 light:text-slate-500">
            <span className="text-emerald-400">✓</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
