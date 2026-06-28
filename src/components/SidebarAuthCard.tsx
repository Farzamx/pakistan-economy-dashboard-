"use client";

// Desktop Sidebar's dedicated auth card (Auth UX Enhancement) — rendered
// near the top of the Sidebar, replacing the old plain-text Login/Logout
// row that previously lived at the bottom of the nav list (keeping both
// would have been a duplicate CTA in the same component). Its own file for
// the same future-analytics reason as HeroAuthCta.tsx — data-cta-source
// ="sidebar" tags every click target, no tracking wired up yet.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { signOutAction } from "@/app/auth/actions";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

export default function SidebarAuthCard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // Closing the modal previously relied entirely on `user` flipping to null
  // and this card re-rendering into its guest branch (which doesn't render
  // the modal at all) — fragile, since it gave the loading state no path
  // back to false if signOutAction()/signOut() ever rejected, and the modal
  // itself deliberately disables Escape/backdrop/Cancel while loading (so a
  // mid-request dismissal can't abandon the sign-out), leaving no fallback
  // exit. The try/finally below makes closing self-contained: it always
  // fires, on success or failure, independent of how/whether `user` updates.
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await Promise.all([signOutAction(), signOut()]);
      router.push("/");
      router.refresh();
    } finally {
      if (isMountedRef.current) {
        setSigningOut(false);
        setConfirmOpen(false);
      }
    }
  }

  if (loading) {
    // Guest and authenticated cards are no longer the same height (138px
    // vs 100px, measured live) now that the authenticated card carries
    // Member Since + Premium Access. Biased toward the guest height since
    // most visits to this dashboard are signed-out — the rarer
    // authenticated case absorbs a small one-time height change instead.
    return <div className="h-[100px] rounded-xl border border-transparent" aria-hidden="true" />;
  }

  if (user) {
    // created_at is a real Supabase field (confirmed present on every
    // user), so "Member Since" always renders — no fabricated fallback
    // date is needed here, unlike fields that genuinely can be missing.
    const memberSince = new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });

    return (
      <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5" data-cta-source="sidebar">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-[var(--text-secondary)]">{user.email}</p>
          <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
            Member
          </span>
        </div>
        <div className="flex flex-col gap-1 text-[11px] text-[var(--text-muted)]">
          <span>Member since {memberSince}</span>
          <span className="flex items-center gap-1 font-medium text-neon-blue">
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1.5l1.9 3.85 4.25.62-3.07 3 .72 4.23L8 11.2l-3.8 2 .72-4.23-3.07-3 4.25-.62z" />
            </svg>
            Premium Access
          </span>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          data-cta="logout"
          data-cta-source="sidebar"
          className="w-full rounded-lg border border-[var(--border)] py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          Logout
        </button>
        <LogoutConfirmModal open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleSignOut} loading={signingOut} />
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
