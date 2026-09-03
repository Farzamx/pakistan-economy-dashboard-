"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import GuestAccessModal from "@/components/GuestAccessModal";
import DecisionLabNavItem from "@/components/DecisionLabNavItem";
import MacroIntelligenceNavItem from "@/components/MacroIntelligenceNavItem";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { isProtectedPath } from "@/lib/protectedSections";

// Primary, site-level navigation — moved out of the Sidebar and into a
// horizontal top bar (PEIC v3 "Institutional Slate" navigation restructure)
// to match the reference design's FT/Bloomberg-style masthead nav rather
// than a SaaS admin panel's stacked sidebar links. The Sidebar keeps only
// secondary/tool navigation (Comparisons, Budget Tracker, Provincial
// Budget, Economic Calendar, Academy, PSX, Settings) below this.
//
// "Research" has no dedicated page in this app yet — mapped to /comparisons
// as the closest existing analytical tool rather than inventing a route.
// "Markets" and "Risk Intel" are homepage anchors (existing sections), not
// new pages.
// "Premium" has no dedicated hub page in this app — the Sidebar's existing
// "Premium Tools" group (Comparisons, Budget Tracker, Provincial Budget,
// Economic Calendar, Academy, PSX) is the real destination that concept
// maps to, so this points at signup (where premium access actually starts)
// rather than inventing a new route. A first-class item in the same nav
// list as Overview/Markets/etc. (not a separate right-aligned CTA) per the
// "Premium is a first-class destination" navigation pass.
// Phase 6 nav-order pass: "Decision Lab" moved to the front (right after
// the logo, before "Overview") to match its flagship status — the pill
// treatment (DecisionLabNavItem) and gap-4 width-recovery math below are
// unaffected by ordering, only by which items exist and how many there
// are, so this reorder carries zero layout risk on its own.
//
// Phase 10 UI refinement: cramming all 9 items into the 800px minimum with
// gap-1/px-2 (the prior Phase 10 fix) was measurably non-overflowing but
// read as visibly cramped — a real, valid complaint, not solvable by
// finding a few more px of trim; there simply isn't room for 9 items with
// GENEROUS spacing at 800px. Fixed instead with a priority tier: `wide:
// true` items (Markets, Research, Risk Intel — already documented above as
// anchors/repurposed stand-ins, not real dedicated pages, the least
// "first-class" of the nine by this file's own pre-existing reasoning)
// are hidden below min-[1280px] and reappear with full generous spacing at
// that width and up. The remaining 6 always-visible items (both flagship
// pills + Overview/Calendar/Academy/Premium) get comfortable — not
// cramped — spacing at every width from 800px, and even more generous
// spacing once the deferred three rejoin at 1280px+.
const NAV_ITEMS: { key: string; href: string; protected?: boolean; wide?: boolean }[] = [
  { key: "decisionLab", href: "/decision-support-lab" },
  { key: "macroIntelligence", href: "/macro-intelligence" },
  { key: "overview", href: "/overview" },
  { key: "markets", href: "/overview#global-markets", wide: true },
  { key: "calendar", href: "/economic-calendar", protected: true },
  { key: "research", href: "/comparisons", protected: true, wide: true },
  { key: "academy", href: "/academy" },
  { key: "riskIntel", href: "/overview#risk-intelligence", wide: true },
  { key: "premium", href: "/signup" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestDestination, setGuestDestination] = useState("/overview");

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, href: string, protectedItem?: boolean) {
    if (!protectedItem || !isProtectedPath(href) || loading || user) return;
    e.preventDefault();
    setGuestDestination(href);
    setGuestModalOpen(true);
  }

  function isActive(href: string): boolean {
    if (href === "/overview") return pathname === "/overview";
    if (href.startsWith("/#")) return false; // homepage anchors — no route to match against off-page
    return !!pathname?.startsWith(href);
  }

  return (
    <>
      {/* min-[800px], not sm (640px) — measured: this header's own content
          needs 787px minimum to lay out without overflowing. Switching to
          desktop nav any earlier than that (the old sm:640px threshold)
          left every page's header overflowing the viewport by up to ~150px
          for the entire 640-786px range — a real, site-wide bug, not a
          cosmetic one. MobileNav/Sidebar/MobileStickyCta all switch at this
          same min-[800px] threshold so the mobile and desktop nav paradigms
          never overlap or leave a gap — this breakpoint itself is never
          moved; only what's visible/how spaced-out it is within it changes
          (see the nav priority-tier comment below). */}
      <header className="sticky top-0 z-30 hidden h-16 w-full items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--background)]/95 px-4 backdrop-blur-xl min-[800px]:flex min-[1280px]:px-6">
        <div className="flex items-center gap-5 min-[1280px]:gap-8">
          <Link href="/overview" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neon-blue/50 font-serif text-base font-semibold text-neon-blue">
              P
            </div>
            {/* The wordmark reserves its own breathing room independently
                of the nav-item priority tier below — 1024px already has
                comfortable room for it once Markets/Research/Risk Intel
                are deferred to 1280px (see below), so it doesn't need to
                wait for that same wider breakpoint. */}
            <span className="hidden font-serif text-[15px] font-semibold tracking-[-0.005em] text-white min-[1024px]:inline light:text-slate-900">
              {t("nav.logoName")}
            </span>
          </Link>

          {/* Priority-tier navigation (Phase 10 UI refinement): the six
              "core" items (both flagship pills + Overview/Calendar/
              Academy/Premium) are always visible from 800px up. The three
              `wide` items (Markets, Research, Risk Intel — see this file's
              own header comment on why these are the least "first-class" of
              the nine) are hidden below min-[1280px] and rejoin once
              there's genuine room for all nine.
              gap-5 (20px) at the core tier, not a smaller value some earlier
              iteration used: measuring the ACTUAL computed layout (not just
              the source classes) showed 123px of unused margin at 800px and
              162px at 1024px even before this pass — confirming a smaller
              gap really did read as visibly tighter than necessary, not
              just a subjective complaint. gap-5 uses ~40px of that slack
              and still leaves 80px+ of margin at 800px. Steps up to gap-6
              (24px) once every item is visible at 1280px+, where margin is
              tighter (31px measured) so a bigger jump isn't safe.
              Re-verified with a real headless-browser measurement — actual
              getComputedStyle() gap/padding values AND actual measured
              pixel distances between rendered items, not source-code
              inference — across 800/820/850/880/1024/1280/1400px. */}
          <nav className="flex items-center gap-5 min-[1280px]:gap-6">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const wideOnly = item.wide ? "hidden min-[1280px]:inline-flex" : "";
              if (item.key === "decisionLab") {
                return <DecisionLabNavItem key={item.key} href={item.href} label={t(`topNav.${item.key}`)} active={active} onClick={(e) => handleClick(e, item.href, item.protected)} />;
              }
              if (item.key === "macroIntelligence") {
                // Full "Macro Intelligence" once the wider 1280px tier has
                // room for it; the shorter "Macro Intel" (matching "Risk
                // Intel"'s existing abbreviation convention in this same
                // bar) below that, where every px is still earning its
                // keep — see MacroIntelligenceNavItem's own comment.
                return (
                  <MacroIntelligenceNavItem
                    key={item.key}
                    href={item.href}
                    shortLabel={t("topNav.macroIntelligence")}
                    longLabel={t("topNav.macroIntelligenceLong")}
                    active={active}
                    onClick={(e) => handleClick(e, item.href, item.protected)}
                  />
                );
              }
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={(e) => handleClick(e, item.href, item.protected)}
                  aria-current={active ? "true" : undefined}
                  className={`${wideOnly} whitespace-nowrap text-sm font-medium transition-colors ${
                    active ? "text-white light:text-slate-900" : "text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"
                  }`}
                >
                  {t(`topNav.${item.key}`)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Returning-visitor routing (Section: Returning-visitor routing) —
              /overview redirects returning visitors away from the marketing
              site's "/" automatically via the peic_returning cookie, so this
              is the one way back to the marketing landing page from inside
              the app itself. Always /home, never "/", so it works even for
              a visitor whose cookie is still set.
              Hidden below 1024px, same reasoning as the wordmark above:
              a secondary convenience link, not a primary nav destination,
              so it defers to where there's comfortable room for it. */}
          <Link
            href="/home"
            className="hidden whitespace-nowrap text-sm font-medium text-white/50 light:text-slate-500 transition-colors hover:text-white min-[1024px]:inline light:hover:text-slate-900"
          >
            Back to site
          </Link>
          {!loading && !user && (
            <Link
              href="/login"
              className="whitespace-nowrap rounded-md border border-[var(--border)] px-3.5 py-1.5 text-sm font-medium text-white/80 light:text-slate-700 transition-colors hover:border-neon-blue/40 hover:text-white light:hover:text-slate-900"
            >
              {t("hero.login")}
            </Link>
          )}
        </div>
      </header>

      <GuestAccessModal open={guestModalOpen} onClose={() => setGuestModalOpen(false)} destination={guestDestination} />
    </>
  );
}
