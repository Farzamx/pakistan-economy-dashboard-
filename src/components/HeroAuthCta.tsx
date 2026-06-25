"use client";

// Hero-section auth entry point (Auth UX Enhancement) — the homepage's
// signup/login CTAs and "Access your dashboard" message for the rare
// returning visitor who is already signed in. Kept as its own component
// (not inlined into Hero.tsx) specifically so a future analytics pass has
// one obvious file to instrument; data-cta-source="hero" tags every click
// target below for that same reason, with no tracking call wired up yet.

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { signOutAction } from "@/app/auth/actions";
import { useRouter } from "next/navigation";

const BENEFITS = ["Access Comparisons", "Access Budget Workshops", "Provincial Budget Intelligence", "Future Member Features"];

export default function HeroAuthCta() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await Promise.all([signOutAction(), signOut()]);
    router.push("/");
    router.refresh();
  }

  // Suppressed entirely while the initial session check is in flight —
  // same convention as Sidebar/MobileNav — to avoid a flash of the wrong
  // state (signup pitch vs. welcome message) on every page load.
  if (loading) return null;

  if (user) {
    return (
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4" data-cta-source="hero">
        <p className="text-sm text-white/70 light:text-slate-600">
          Welcome back, <span className="font-semibold text-white light:text-slate-900">{user.email}</span>
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/comparisons"
            data-cta="dashboard-access"
            data-cta-source="hero"
            className="rounded-xl border border-neon-blue/30 bg-neon-blue/10 px-4 py-2 text-sm font-semibold text-neon-blue transition-colors hover:bg-neon-blue/20"
          >
            Dashboard Access
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            data-cta="logout"
            data-cta-source="hero"
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4" data-cta-source="hero">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/signup"
          data-cta="signup"
          data-cta-source="hero"
          className="glow-blue rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Create Free Account
        </Link>
        <Link
          href="/login"
          data-cta="login"
          data-cta-source="hero"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          Login
        </Link>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-1.5 text-xs text-white/50 light:text-slate-500">
            <span className="text-emerald-400">✓</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
