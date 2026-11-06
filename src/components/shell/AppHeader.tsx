"use client";

// The application header (PEIC redesign Phase 2). Replaces TopNav (desktop
// bar), MobileNav (floating hamburger + drawer) and the desktop Sidebar's
// navigation tree, search, auth card and Settings entry point with one
// compact navy bar:
//
//   PEIC | Overview  Indicators▾  Markets  Calendar  News  Research▾  Tools▾ | search  theme  account
//
// Breakpoints: the full bar from 1024px (lg); below that a menu button opens
// MobileDrawer with the same APP_NAV entries. Inline search from 1280px (xl);
// below that a search button opens a search row under the bar.
//
// Renders on every app route through AppShell — never on the marketing pages
// (ConditionalAppChrome keeps those out of the app chunk entirely).

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import SettingsModal from "@/components/SettingsModal";
import { useLanguage } from "@/components/LanguageProvider";
import { APP_NAV, OVERVIEW_PATH, ariaCurrentFor, hrefPath, resolveActiveNav } from "@/lib/appNav";
import AccountControl from "./AccountControl";
import MobileDrawer from "./MobileDrawer";
import NavMenu from "./NavMenu";
import OverviewNavItem from "./OverviewNavItem";
import ThemeToggle from "./ThemeToggle";
import { useGuestGate, useOverviewSections } from "./shellHooks";

export default function AppHeader() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const active = resolveActiveNav(pathname);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { gate, guestModal } = useGuestGate();
  const onOverview = pathname === OVERVIEW_PATH;
  const overviewSections = useOverviewSections(onOverview);

  // Any route change closes every popup. Adjusted during render (React's
  // pattern for resetting state when a value changes) rather than in an
  // effect, as MobileNav.tsx already does.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpenMenu(null);
    setDrawerOpen(false);
    setSearchOpen(false);
  }

  const closeDrawer = useCallback((opts?: { restoreFocus?: boolean }) => {
    setDrawerOpen(false);
    // Return focus to the control that opened it — except when the drawer is
    // handing off to a modal (guest gate, Settings, sign-out confirmation),
    // which must keep focus itself.
    if (opts?.restoreFocus !== false) setTimeout(() => menuButtonRef.current?.focus(), 0);
  }, []);

  function onAction(id: "settings") {
    if (id === "settings") setSettingsOpen(true);
  }

  function handleTopLinkClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (gate(e, href)) return;
    setOpenMenu(null);
  }

  function handleSearchLinkClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    gate(e, href);
    // Same-page hash results (e.g. /overview#inflation) don't change the
    // pathname, so close the search row explicitly.
    if (hrefPath(href) === pathname) setTimeout(() => setSearchOpen(false), 0);
  }

  function skipToContent(e: React.MouseEvent<HTMLAnchorElement>) {
    // Pages don't share a common id on <main>, so target the element itself.
    const main = document.querySelector("main");
    if (!main) return;
    e.preventDefault();
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.focus();
    main.scrollIntoView();
  }

  return (
    <>
      <a
        href="#main-content"
        onClick={skipToContent}
        className="sr-only z-[70] rounded-[var(--pe-radius)] bg-pe-surface px-3 py-2 text-[14px] font-medium text-pe-accent shadow-[var(--pe-shadow-pop)] focus:not-sr-only focus:fixed focus:start-2 focus:top-2"
      >
        {t("appNav.skipToContent")}
      </a>

      <header data-app-header className="sticky top-0 z-30 w-full border-b border-black/20 bg-pe-nav text-pe-nav-text">
        <div className="pe-on-nav relative mx-auto flex h-[var(--app-header-h)] max-w-[1600px] items-center gap-1 px-2 sm:px-4">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("appNav.openMenu")}
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--pe-radius)] text-pe-nav-text hover:bg-pe-nav-raised lg:hidden"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link
            href="/overview"
            aria-label="PEIC — Pakistan Economic Intelligence Center"
            className="flex h-9 shrink-0 items-center gap-2 rounded-[var(--pe-radius)] px-1.5"
          >
            {/* Wordmark only. The two-line "Pakistan Economic Intelligence
                Center" strapline that used to sit beside it at 2xl was
                competing with the search field for the same row (reference
                screenshot shows the mark alone); the full name is still the
                link's accessible name and the <title> of every page. */}
            <span className="text-[18px] font-bold leading-none tracking-[0.04em] text-white">PEIC</span>
          </Link>

          <nav aria-label={t("appNav.mainNav")} className="ms-3 hidden h-full shrink-0 lg:block">
            <ul className="flex h-full items-stretch">
              {APP_NAV.map((entry) => {
                if (entry.kind === "menu") {
                  return (
                    <NavMenu
                      key={entry.id}
                      entry={entry}
                      open={openMenu === entry.id}
                      onOpenChange={(next) => setOpenMenu(next ? entry.id : null)}
                      active={active}
                      onLinkClick={gate}
                      onAction={onAction}
                    />
                  );
                }
                if (entry.id === "overview" && onOverview) {
                  return (
                    <OverviewNavItem
                      key={entry.id}
                      labelKey={entry.labelKey!}
                      open={openMenu === "overview-sections"}
                      onOpenChange={(next) => setOpenMenu(next ? "overview-sections" : null)}
                      sections={overviewSections}
                    />
                  );
                }
                const current = ariaCurrentFor(active, entry.id);
                return (
                  <li key={entry.id} className="flex h-full items-stretch">
                    <Link
                      href={entry.href}
                      aria-current={current}
                      onClick={(e) => handleTopLinkClick(e, entry.href)}
                      className={`relative flex items-center whitespace-nowrap px-3 text-[14px] font-medium transition-colors ${
                        current ? "text-pe-nav-text" : "text-pe-nav-text-muted hover:text-pe-nav-text"
                      }`}
                    >
                      {t(entry.labelKey!)}
                      {current && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 bg-pe-nav-accent" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Search sits in the header row directly after the navigation
              items (reference screenshot), not pinned to the far right. It
              takes the leftover width via flex-1 with a sane max, so the bar
              reads as one continuous strip: PEIC | nav | search | controls.
              Inline from lg (where the nav itself appears) rather than xl,
              so there is no width at which the desktop nav is visible but
              search is hidden behind a button. */}
          <div className="ms-3 hidden min-w-0 flex-1 lg:block xl:ms-4">
            <div className="max-w-[420px]">
              <GlobalSearch variant="nav" onLinkClick={handleSearchLinkClick} />
            </div>
          </div>

          <div className="ms-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={searchOpen ? t("appNav.closeSearch") : t("appNav.openSearch")}
              aria-expanded={searchOpen}
              aria-controls="app-header-search"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-[var(--pe-radius)] text-pe-nav-text hover:bg-pe-nav-raised lg:hidden ${searchOpen ? "bg-pe-nav-raised" : ""}`}
            >
              <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="5" />
                <path d="M11 11l3.5 3.5" />
              </svg>
            </button>
            <ThemeToggle className="text-pe-nav-text hover:bg-pe-nav-raised" />
            <AccountControl />
          </div>
        </div>

        {searchOpen && (
          <div id="app-header-search" className="border-t border-pe-nav-border bg-pe-surface px-3 py-2 lg:hidden">
            <div className="mx-auto max-w-xl">
              <GlobalSearch variant="surface" autoFocus onLinkClick={handleSearchLinkClick} />
            </div>
          </div>
        )}
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        active={active}
        gate={gate}
        onAction={onAction}
        overviewSections={onOverview ? overviewSections : null}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {guestModal}
    </>
  );
}
