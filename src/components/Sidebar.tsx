"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import SettingsModal from "@/components/SettingsModal";
import PsxComingSoonModal from "@/components/PsxComingSoonModal";

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

export default function Sidebar() {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [psxOpen, setPsxOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(NAV_ITEMS[0].id);

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

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {/* Comparisons renders first (premium/marketing placement — the
              first thing a visitor sees), then Overview, then the rest of
              NAV_ITEMS. Comparisons is rendered as its own block (not part
              of NAV_ITEMS) since it's a real route, not a same-page anchor,
              and needs its own Link + usePathname active-state check
              instead of the scroll-spy logic the homepage anchors use.
              Crucially, this is a purely visual reorder — it does NOT
              change what's active on first load: `activeId` below still
              initializes to NAV_ITEMS[0].id ("overview"), and visiting "/"
              always renders the homepage starting at #overview regardless
              of sidebar order, so Comparisons being listed first never
              auto-selects or auto-scrolls to /comparisons. NAV_ITEMS itself
              also stays in document order (Overview first) so the
              scroll-spy's "last in document order wins" tie-break logic
              above is unaffected by this visual-only reordering. */}
          <motion.div
            whileHover={{ x: 4, scale: 1.015 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="mb-1"
          >
            <Link
              href="/comparisons"
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

          {(() => {
            const isActive = isHomepage && activeId === NAV_ITEMS[0].id;
            return (
              <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <Link
                  href={`/#${NAV_ITEMS[0].id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`block rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-neon-blue/25 bg-neon-blue/10 text-white light:text-slate-900"
                      : "border-transparent text-white/50 light:text-slate-500 hover:bg-white/5 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
                  }`}
                >
                  {NAV_ITEMS[0].label}
                </Link>
              </motion.div>
            );
          })()}

          {NAV_ITEMS.slice(1).map((item) => {
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
    </>
  );
}
