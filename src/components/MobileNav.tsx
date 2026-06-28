"use client";

// Mobile navigation — the desktop Sidebar is `hidden sm:flex`, so below the
// sm breakpoint there was previously no way to discover Comparisons, the
// Budget Workshop, or the Provincial Budget Workshop at all (the mobile
// nav audit that prompted this file). A fixed hamburger button + slide-out
// drawer, built from the same primitives already used elsewhere
// (AnimatePresence backdrop/panel like GuestAccessModal, click-
// interception + isProtectedPath like Sidebar.tsx) rather than a new
// pattern.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import GuestAccessModal from "@/components/GuestAccessModal";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import GlobalSearch from "@/components/GlobalSearch";
import { useAuth } from "@/components/AuthProvider";
import { signOutAction } from "@/app/auth/actions";
import { isProtectedPath } from "@/lib/protectedSections";

interface DrawerLink {
  label: string;
  href: string;
  /** "purple" | "blue" | "emerald" | "cyan" match the desktop Sidebar's four premium sections exactly; omitted for the plain items (Rankings, News, Indicators, Overview). */
  premium?: "purple" | "blue" | "emerald" | "cyan";
  icon: React.ReactNode;
}

const PREMIUM_STYLES: Record<string, { active: string; inactive: string; iconColor: string }> = {
  purple: {
    active: "border-neon-purple/50 bg-gradient-to-r from-neon-blue/25 to-neon-purple/25 text-white shadow-[0_0_22px_rgba(168,85,247,0.45)]",
    inactive: "border-neon-purple/25 bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 text-white/90 shadow-[0_0_14px_rgba(168,85,247,0.2)]",
    iconColor: "text-neon-purple drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]",
  },
  blue: {
    active: "border-neon-blue/40 bg-neon-blue/15 text-white shadow-[0_0_16px_rgba(56,189,248,0.35)]",
    inactive: "border-neon-blue/20 bg-neon-blue/5 text-white/85",
    iconColor: "text-neon-blue",
  },
  emerald: {
    active: "border-emerald-400/40 bg-emerald-400/15 text-white shadow-[0_0_16px_rgba(52,211,153,0.35)]",
    inactive: "border-emerald-400/20 bg-emerald-400/5 text-white/85",
    iconColor: "text-emerald-400",
  },
  cyan: {
    active: "border-cyan-400/40 bg-cyan-400/15 text-white shadow-[0_0_16px_rgba(34,211,238,0.35)]",
    inactive: "border-cyan-400/20 bg-cyan-400/5 text-white/85",
    iconColor: "text-cyan-400",
  },
};

const LINKS: DrawerLink[] = [
  {
    label: "Overview",
    href: "/#overview",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Comparisons",
    href: "/comparisons",
    premium: "purple",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 16l4.5-7L12 13l4-6L21 8" />
        <path d="M19 4l2 2-2 2M5 16l-2 2 2 2" />
      </svg>
    ),
  },
  {
    label: "Budget Tracker",
    href: "/budget",
    premium: "blue",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="10" width="4" height="10" />
        <rect x="10" y="6" width="4" height="14" />
        <rect x="17" y="13" width="4" height="7" />
      </svg>
    ),
  },
  {
    label: "Provincial Budget",
    href: "/provincial-budget",
    premium: "emerald",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 14l3-3 3 2 4-5" />
      </svg>
    ),
  },
  {
    label: "Economic Calendar",
    href: "/economic-calendar",
    premium: "cyan",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    label: "Rankings",
    href: "/provincial-budget/rankings",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 20V10M14 20V4M20 20v-7M4 20v-4" />
      </svg>
    ),
  },
  {
    label: "News",
    href: "/#news-intelligence",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 8h10M7 12h10M7 16h6" />
      </svg>
    ),
  },
  {
    label: "Indicators",
    href: "/pakistan-economic-indicators",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l5-5 4 4 8-9" />
      </svg>
    ),
  },
];

const BACKDROP = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const PANEL = { hidden: { x: "-100%" }, visible: { x: 0 } };

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestDestination, setGuestDestination] = useState("/");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  // See SidebarAuthCard.tsx for why this guard exists — closing the modal
  // must not depend solely on `user` flipping to null and this drawer's
  // footer re-rendering into its guest branch; the try/finally in
  // handleSignOut below needs to know it's still safe to setState.
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Closing the drawer on every route change (not just on link click) also
  // covers the GuestAccessModal's own internal Login/Sign Up links, which
  // navigate to /login or /signup while the drawer is still technically
  // "open" underneath the modal. Adjusted directly during render (React's
  // recommended pattern for "reset state when a prop changes") rather than
  // in an effect — calling setState synchronously inside an effect body
  // triggers an avoidable extra render and React's own purity lint rule.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (isProtectedPath(href) && !loading && !user) {
      e.preventDefault();
      // Close the drawer first — GuestAccessModal renders at z-50, below
      // the drawer's z-[60], specifically so the drawer can sit above
      // page-chrome like CreatorBadge while open. Leaving the drawer
      // mounted here would hide the modal behind it instead of replacing it.
      setOpen(false);
      setGuestDestination(href);
      setGuestModalOpen(true);
      return;
    }
    // Deliberately NOT calling setOpen(false) here for a real navigation.
    // Next's <Link> drives the route transition off this same click event;
    // synchronously unmounting the drawer (and the clicked <a> with it) in
    // the same tick raced with that transition and silently swallowed the
    // navigation for some links (found live during the authenticated-user
    // audit — Comparisons/Provincial Budget/Rankings clicked but never
    // navigated, with no error). The pathname-change check above already
    // closes the drawer reactively once the route actually changes; for the
    // hash-only links (Overview/News) where pathname doesn't change because
    // only the anchor does, fall back to a deferred close so it doesn't
    // race the same way.
    setTimeout(() => setOpen(false), 0);
  }

  async function handleSignOut() {
    setOpen(false);
    setSigningOut(true);
    try {
      // Both calls matter: signOutAction() clears the server-side session
      // cookie (what proxy.ts reads), and useAuth().signOut() clears the
      // browser's own Supabase client instance — found live during the
      // authenticated-user audit that calling only the server action left
      // the drawer showing "Log Out" after logging out, since
      // AuthProvider's user state is only ever updated by its own client
      // instance's onAuthStateChange listener, which router.refresh() does
      // not touch.
      await Promise.all([signOutAction(), signOut()]);
      router.push("/");
      router.refresh();
    } finally {
      // Always runs — on success, on a rejected signOutAction()/signOut(),
      // or anything else — so the modal can never get stuck open with a
      // perpetual spinner. See SidebarAuthCard.tsx for the full rationale.
      if (isMountedRef.current) {
        setSigningOut(false);
        setLogoutConfirmOpen(false);
      }
    }
  }

  // Closes the drawer and shows the confirmation modal instead of signing
  // out directly — the drawer must close first since it renders above the
  // modal (z-[60] vs the modal's z-50); cancelling just leaves the drawer
  // closed, same as it already behaves for any other link click.
  function requestSignOut() {
    setOpen(false);
    setLogoutConfirmOpen(true);
  }

  return (
    <>
      {/* Hamburger trigger — fixed, visible only below sm */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="glass-card fixed left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-xl border-white/10 text-white/80 light:text-slate-700 shadow-[0_0_16px_rgba(56,189,248,0.15)] sm:hidden"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="mobilenav-backdrop"
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm sm:hidden"
              variants={BACKDROP}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="mobilenav-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="fixed inset-y-0 left-0 z-[60] flex w-[82vw] max-w-[320px] flex-col gap-6 overflow-y-auto border-r border-white/10 bg-[#05060f] light:bg-white p-5 shadow-2xl sm:hidden"
              variants={PANEL}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="glow-blue flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple text-lg font-bold text-white">
                    P
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white light:text-slate-900">Pakistan EIC</p>
                    <p className="text-xs text-white/40 light:text-slate-400">Economic Dashboard</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation menu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 light:text-slate-400 transition-colors hover:bg-white/5 light:hover:bg-slate-100"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 2l12 12M14 2L2 14" />
                  </svg>
                </button>
              </div>

              <GlobalSearch onLinkClick={handleLinkClick} />

              <nav className="flex flex-col gap-1.5">
                {LINKS.map((link) => {
                  const isActive = link.href.startsWith("/#") ? false : pathname?.startsWith(link.href.split("?")[0]);
                  const style = link.premium ? PREMIUM_STYLES[link.premium] : null;
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={(e) => handleLinkClick(e, link.href)}
                      aria-current={isActive ? "true" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                        style
                          ? isActive ? style.active : style.inactive
                          : isActive
                            ? "border-neon-blue/25 bg-neon-blue/10 text-white light:text-slate-900"
                            : "border-transparent text-white/60 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-100"
                      }`}
                    >
                      <span className={style ? style.iconColor : "text-white/40 light:text-slate-400"}>{link.icon}</span>
                      <span className={link.premium ? "font-semibold" : undefined}>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto flex flex-col gap-2 border-t border-white/5 light:border-slate-200 pt-4">
                {!loading && (
                  user ? (
                    <>
                      <p className="truncate px-1 text-xs text-white/40 light:text-slate-500">{user.email}</p>
                      <button
                        type="button"
                        onClick={requestSignOut}
                        className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-white/80 light:text-slate-700 transition-colors hover:bg-white/5 light:hover:bg-slate-100"
                      >
                        Log Out
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-center text-sm font-medium text-white/80 light:text-slate-700 transition-colors hover:bg-white/5 light:hover:bg-slate-100"
                      >
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setOpen(false)}
                        className="flex-1 rounded-lg bg-neon-blue px-4 py-2.5 text-center text-sm font-semibold text-[#05060f] transition-opacity hover:opacity-90"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <GuestAccessModal open={guestModalOpen} onClose={() => setGuestModalOpen(false)} destination={guestDestination} />
      <LogoutConfirmModal open={logoutConfirmOpen} onClose={() => setLogoutConfirmOpen(false)} onConfirm={handleSignOut} loading={signingOut} />
    </>
  );
}
