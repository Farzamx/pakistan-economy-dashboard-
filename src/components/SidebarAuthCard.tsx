"use client";

// Desktop Sidebar's dedicated auth card (Auth UX Enhancement) — rendered
// near the top of the Sidebar, replacing the old plain-text Login/Logout
// row that previously lived at the bottom of the nav list (keeping both
// would have been a duplicate CTA in the same component). Its own file for
// the same future-analytics reason as HeroAuthCta.tsx — data-cta-source
// ="sidebar" tags every click target, no tracking wired up yet.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { signOutAction } from "@/app/auth/actions";

export default function SidebarAuthCard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await Promise.all([signOutAction(), signOut()]);
    router.push("/");
    router.refresh();
  }

  if (loading) {
    // Reserve the same footprint as the loaded states so the rest of the
    // sidebar doesn't visibly shift down once the session check resolves.
    return <div className="h-[88px] rounded-xl border border-transparent" aria-hidden="true" />;
  }

  if (user) {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5" data-cta-source="sidebar">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-[var(--text-secondary)]">{user.email}</p>
          <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
            Member
          </span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          data-cta="logout"
          data-cta-source="sidebar"
          className="w-full rounded-lg border border-[var(--border)] py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neon-blue/20 bg-gradient-to-br from-neon-blue/10 to-neon-purple/10 p-3.5" data-cta-source="sidebar">
      <Link
        href="/signup"
        data-cta="signup"
        data-cta-source="sidebar"
        className="glow-blue w-full rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple py-2 text-center text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        Create Free Account
      </Link>
      <Link
        href="/login"
        data-cta="login"
        data-cta-source="sidebar"
        className="w-full rounded-lg border border-[var(--border)] py-1.5 text-center text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      >
        Login
      </Link>
    </div>
  );
}
