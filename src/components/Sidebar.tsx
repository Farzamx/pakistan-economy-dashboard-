"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import SettingsModal from "@/components/SettingsModal";
import PsxComingSoonModal from "@/components/PsxComingSoonModal";
import GuestAccessModal from "@/components/GuestAccessModal";
import SidebarAuthCard from "@/components/SidebarAuthCard";
import GlobalSearch from "@/components/GlobalSearch";
import { useAuth } from "@/components/AuthProvider";
import { isProtectedPath } from "@/lib/protectedSections";

// `id` is the homepage section's element id. The rendered href is always
// "/#id" (absolute, never a bare "#id") — these are anchors on `/` only,
// and a bare "#id" resolves against whatever route is currently active. On
// /comparisons (or any future non-homepage route) that silently produces
// "/comparisons#id", which matches nothing and leaves the current page
// mounted instead of navigating away — the bug this fixes.
const NAV_ITEMS = [
  { label: "Overview",        id: "overview" },
  { label: "Risk Intel",      id: "risk-intelligence" },
  { label: "GDP",             id: "gdp" },
  { label: "Inflation",       id: "inflation" },
  { label: "Prices",          id: "price-indices" },
  { label: "Monetary Policy", id: "monetary-policy" },
  { label: "Global Markets",  id: "global-markets" },
  { label: "Real Economy",    id: "real-economy" },
  { label: "Reserves",        id: "reserves" },
  { label: "Live FX",         id: "live-fx" },
  { label: "Exchange Rate",   id: "exchange-rate" },
  { label: "Remittances",     id: "remittances" },
  { label: "External Sector", id: "external-sector" },
  { label: "News",            id: "news-intelligence" },
];

// Sidebar Information Architecture grouping — purely a rendering split of
// NAV_ITEMS into labeled bands (Main / Analytics). NAV_ITEMS' own array
// order is untouched, so the scroll-spy's "last in document order wins"
// tie-break logic above stays correct; this only changes how the same
// items are bucketed under headers, not their underlying order or ids.
// "External Sector" and "News" aren't in the original IA spec's Analytics
// list but are real, working sections — folding them into Analytics
// (rather than dropping them) keeps that existing functionality intact.
const MAIN_NAV_ITEMS = NAV_ITEMS.slice(0, 2);
const ANALYTICS_NAV_ITEMS = NAV_ITEMS.slice(2);

function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30 light:text-slate-400 first:mt-0">
      {children}
    </p>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const { user, loading } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [psxOpen, setPsxOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(NAV_ITEMS[0].id);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestDestination, setGuestDestination] = useState("/");

  // Intercepts a click on a protected section's Link while signed out:
  // prevents the navigation and opens the GuestAccessModal instead, so a
  // guest never sees a flash of the page before proxy.ts would otherwise
  // redirect them. Signed-in users (and while the initial session check is
  // still loading) navigate normally — showing the modal during `loading`
  // would misfire for users who are actually signed in but whose session
  // hasn't resolved on this render yet.
  function handleProtectedNav(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!isProtectedPath(href)) return;
    if (loading || user) return;
    e.preventDefault();
    setGuestDestination(href);
    setGuestModalOpen(true);
  }

  // Scroll-spy: highlights whichever section is currently in view. A thin
  // detection band near the top of the viewport (via rootMargin) decides
  // which section "counts" as current. When two adjacent sections both
  // straddle that band during a fast scroll, the one furthest down the
  // page (last in document order) wins — matching downward scroll intent.
  // Only meaningful on the homepage — these section ids don't exist on any
  // other route, so the effect is a no-op (and correctly inert) elsewhere.
  useEffect(() => {
    if (!isHomepage) return;

    const ids = NAV_ITEMS.map((item) => item.id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }
        for (let i = ids.length - 1; i >= 0; i--) {
          if (visible.has(ids[i])) {
            setActiveId(ids[i]);
            break;
          }
        }
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHomepage]);

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col gap-8 border-r border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-6 backdrop-blur-xl light:backdrop-blur-none sm:flex sticky top-0 h-screen overflow-y-auto hide-scrollbar light:shadow-[1px_0_0_0_#E2E6EF]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="glow-blue flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple text-lg font-bold text-white">
            P
          </div>
          <div>
            <p className="text-sm font-semibold text-white light:text-slate-900">Pakistan EIC</p>
            <p className="text-xs text-white/40 light:text-slate-400">Economic Dashboard</p>
          </div>
        </div>

        {/* Auth card — near the top per the Auth UX Enhancement, replacing
            the old plain-text Login/Logout row that used to live at the
            bottom of the nav below (kept there would have been a duplicate
            CTA in the same sidebar). */}
        <SidebarAuthCard />

        <GlobalSearch onLinkClick={handleProtectedNav} />

        {/* Navigation — grouped per the Sidebar Information Architecture
            pass into Main / Analytics / Premium Tools bands. Premium Tools
            (including PSX) now renders FIRST, directly below the search
            bar — these are flagship/value-added features (Comparisons,
            Budget Tracker, Provincial Budget, Economic Calendar, PSX) and
            the Navigation UX Improvement pass moved them above the fold so
            they're visible without scrolling, rather than after the full
            Main/Analytics anchor list. This is purely a sidebar DOM
            position change — it doesn't touch NAV_ITEMS' own order, so the
            scroll-spy's "last in document order wins" tie-break and the
            `activeId` default ("overview") are unaffected.
            Economic Calendar joined this group (moved out of Analytics
            below) when it became a premium tool — same gating, same
            gradient/glow treatment as its three siblings here, just its
            own color (cyan) so all four stay visually distinct. */}
        <nav className="flex flex-col gap-1">
          <SidebarSectionLabel>Premium Tools</SidebarSectionLabel>

          {/* Comparisons — purple, same Link + usePathname pattern as the
              other premium routes (real routes, not same-page anchors, so
              they need active-state from the pathname rather than the
              scroll-spy). */}
          <motion.div
            whileHover={{ x: 4, scale: 1.015 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="mb-1"
          >
            <Link
              href="/comparisons"
              onClick={(e) => handleProtectedNav(e, "/comparisons")}
              aria-current={pathname?.startsWith("/comparisons") ? "true" : undefined}
              className={`group relative flex items-center gap-2.5 overflow-hidden rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                pathname?.startsWith("/comparisons")
                  ? "border-neon-purple/50 bg-gradient-to-r from-neon-blue/25 to-neon-purple/25 text-white shadow-[0_0_22px_rgba(168,85,247,0.45)] light:text-slate-900"
                  : "border-neon-purple/25 bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 text-white/90 shadow-[0_0_14px_rgba(168,85,247,0.2)] hover:border-neon-purple/45 hover:shadow-[0_0_22px_rgba(168,85,247,0.4)] hover:text-white light:text-slate-700 light:hover:text-slate-900"
              }`}
            >
              <svg
                className="h-4 w-4 shrink-0 text-neon-purple drop-shadow-[0_0_6px_rgba(168,85,247,0.6)] transition-transform duration-300 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 16l4.5-7L12 13l4-6L21 8" />
                <path d="M19 4l2 2-2 2M5 16l-2 2 2 2" />
              </svg>
              <span>Comparisons</span>
              <span
                aria-hidden="true"
                className="ml-auto text-xs text-neon-blue opacity-80 transition-opacity group-hover:opacity-100"
              >
                ✦
              </span>
            </Link>
          </motion.div>

          {/* Budget Tracker — blue, second premium placement. */}
          <motion.div
            whileHover={{ x: 4, scale: 1.015 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="mb-1"
          >
            <Link
              href="/budget"
              onClick={(e) => handleProtectedNav(e, "/budget")}
              aria-current={pathname?.startsWith("/budget") ? "true" : undefined}
              className={`group relative flex items-center gap-2.5 overflow-hidden rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                pathname?.startsWith("/budget")
                  ? "border-neon-blue/40 bg-neon-blue/15 text-white shadow-[0_0_16px_rgba(56,189,248,0.35)] light:text-slate-900"
                  : "border-neon-blue/20 bg-neon-blue/5 text-white/85 hover:border-neon-blue/35 hover:bg-neon-blue/10 hover:text-white light:text-slate-700 light:hover:text-slate-900"
              }`}
            >
              <svg
                className="h-4 w-4 shrink-0 text-neon-blue transition-transform duration-300 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="10" width="4" height="10" />
                <rect x="10" y="6" width="4" height="14" />
                <rect x="17" y="13" width="4" height="7" />
              </svg>
              <span>Budget Tracker</span>
            </Link>
          </motion.div>

          {/* Provincial Budget — emerald, third premium placement. */}
          <motion.div
            whileHover={{ x: 4, scale: 1.015 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="mb-1"
          >
            <Link
              href="/provincial-budget"
              onClick={(e) => handleProtectedNav(e, "/provincial-budget")}
              aria-current={pathname?.startsWith("/provincial-budget") ? "true" : undefined}
              className={`group relative flex items-center gap-2.5 overflow-hidden rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                pathname?.startsWith("/provincial-budget")
                  ? "border-emerald-400/40 bg-emerald-400/15 text-white shadow-[0_0_16px_rgba(52,211,153,0.35)] light:text-slate-900"
                  : "border-emerald-400/20 bg-emerald-400/5 text-white/85 hover:border-emerald-400/35 hover:bg-emerald-400/10 hover:text-white light:text-slate-700 light:hover:text-slate-900"
              }`}
            >
              <svg
                className="h-4 w-4 shrink-0 text-emerald-400 transition-transform duration-300 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M7 14l3-3 3 2 4-5" />
              </svg>
              <span>Provincial Budget</span>
            </Link>
          </motion.div>

          {/* Economic Calendar — cyan, fourth premium placement. */}
          <motion.div
            whileHover={{ x: 4, scale: 1.015 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="mb-1"
          >
            <Link
              href="/economic-calendar"
              onClick={(e) => handleProtectedNav(e, "/economic-calendar")}
              aria-current={pathname?.startsWith("/economic-calendar") ? "true" : undefined}
              className={`group relative flex items-center gap-2.5 overflow-hidden rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                pathname?.startsWith("/economic-calendar")
                  ? "border-cyan-400/40 bg-cyan-400/15 text-white shadow-[0_0_16px_rgba(34,211,238,0.35)] light:text-slate-900"
                  : "border-cyan-400/20 bg-cyan-400/5 text-white/85 hover:border-cyan-400/35 hover:bg-cyan-400/10 hover:text-white light:text-slate-700 light:hover:text-slate-900"
              }`}
            >
              <svg
                className="h-4 w-4 shrink-0 text-cyan-400 transition-transform duration-300 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
              <span>Economic Calendar</span>
            </Link>
          </motion.div>

          {/* PSX — opens "Coming Soon" modal, not a nav link */}
          <motion.button
            type="button"
            onClick={() => setPsxOpen(true)}
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex w-full items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-white/50 light:text-slate-500 transition-colors hover:bg-white/5 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
          >
            <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l5-5 4 4 6-7" />
              <path d="M14 9h5v5" />
            </svg>
            PSX
          </motion.button>

          <SidebarSectionLabel>Main</SidebarSectionLabel>
          {MAIN_NAV_ITEMS.map((item) => {
            // Only ever "active" while actually on the homepage — otherwise
            // "Overview" (the scroll-spy's unchanged default) would show as
            // active while on an unrelated route like /comparisons.
            const isActive = isHomepage && activeId === item.id;
            return (
              <motion.div key={item.label} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <Link
                  href={`/#${item.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`block rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-neon-blue/25 bg-neon-blue/10 text-white light:text-slate-900"
                      : "border-transparent text-white/50 light:text-slate-500 hover:bg-white/5 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              </motion.div>
            );
          })}

          <SidebarSectionLabel>Analytics</SidebarSectionLabel>

          {ANALYTICS_NAV_ITEMS.map((item) => {
            const isActive = isHomepage && activeId === item.id;
            return (
              <motion.div key={item.label} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <Link
                  href={`/#${item.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`block rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-neon-blue/25 bg-neon-blue/10 text-white light:text-slate-900"
                      : "border-transparent text-white/50 light:text-slate-500 hover:bg-white/5 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              </motion.div>
            );
          })}

          {/* Settings — opens modal, not a nav link */}
          <motion.button
            type="button"
            onClick={() => setSettingsOpen(true)}
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex w-full items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-white/50 light:text-slate-500 transition-colors hover:bg-white/5 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
          >
            <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="2.5" />
              <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" strokeLinecap="round" />
            </svg>
            Settings
          </motion.button>
        </nav>

        {/* Footer note */}
        <div className="mt-auto rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.03] light:bg-slate-50 p-4 text-xs text-white/40 light:text-slate-400">
          Live data from SBP EasyData &amp; World Bank.
        </div>
      </aside>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PsxComingSoonModal open={psxOpen} onClose={() => setPsxOpen(false)} />
      <GuestAccessModal open={guestModalOpen} onClose={() => setGuestModalOpen(false)} destination={guestDestination} />
    </>
  );
}
