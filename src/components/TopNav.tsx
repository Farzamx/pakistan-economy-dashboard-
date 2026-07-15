"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import GuestAccessModal from "@/components/GuestAccessModal";
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
const NAV_ITEMS: { key: string; href: string; protected?: boolean }[] = [
  { key: "overview", href: "/" },
  { key: "markets", href: "/#global-markets" },
  { key: "calendar", href: "/economic-calendar", protected: true },
  { key: "research", href: "/comparisons", protected: true },
  { key: "academy", href: "/academy" },
  { key: "riskIntel", href: "/#risk-intelligence" },
  { key: "premium", href: "/signup" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestDestination, setGuestDestination] = useState("/");

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, href: string, protectedItem?: boolean) {
    if (!protectedItem || !isProtectedPath(href) || loading || user) return;
    e.preventDefault();
    setGuestDestination(href);
    setGuestModalOpen(true);
  }

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return false; // homepage anchors — no route to match against off-page
    return !!pathname?.startsWith(href);
  }

  return (
    <>
      <header className="sticky top-0 z-30 hidden h-16 w-full items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--background)]/95 px-8 backdrop-blur-xl sm:flex">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neon-blue/50 font-serif text-base font-semibold text-neon-blue">
              P
            </div>
            <span className="font-serif text-[15px] font-semibold tracking-[-0.005em] text-white light:text-slate-900">
              {t("nav.logoName")}
            </span>
          </Link>

          <nav className="flex items-center gap-7">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={(e) => handleClick(e, item.href, item.protected)}
                  aria-current={active ? "true" : undefined}
                  className={`text-sm font-medium transition-colors ${
                    active ? "text-white light:text-slate-900" : "text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"
                  }`}
                >
                  {t(`topNav.${item.key}`)}
                </Link>
              );
            })}
          </nav>
        </div>

        {!loading && !user && (
          <Link
            href="/login"
            className="rounded-md border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-white/80 light:text-slate-700 transition-colors hover:border-neon-blue/40 hover:text-white light:hover:text-slate-900"
          >
            {t("hero.login")}
          </Link>
        )}
      </header>

      <GuestAccessModal open={guestModalOpen} onClose={() => setGuestModalOpen(false)} destination={guestDestination} />
    </>
  );
}
