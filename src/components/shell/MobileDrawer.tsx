"use client";

// Mobile / narrow-width navigation drawer (PEIC redesign Phase 2) — replaces
// MobileNav.tsx's drawer, driven by the same APP_NAV registry as the desktop
// bar so the two can't offer different destinations.
//
// Carries over MobileNav's hard-won behaviour:
//   - a protected destination for a guest closes the drawer FIRST, then the
//     host shows GuestAccessModal (z-50, which renders below this z-[60]);
//   - a same-page hash link closes the drawer, then scrolls (the drawer's
//     body scroll lock would otherwise swallow the scroll);
//   - a real navigation is NOT closed synchronously — unmounting the clicked
//     <a> in the same tick raced Next's <Link> and silently dropped some
//     navigations; the host closes the drawer when the pathname changes.
// Adds: focus moves into the dialog on open, Tab is trapped inside it,
// Escape and the backdrop close it, and focus returns to the menu button.

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { ACCOUNT_UI_ENABLED } from "@/lib/accessPolicy";
import { OVERVIEW_PATH, OVERVIEW_SECTIONS, PUBLIC_APP_NAV, ariaCurrentFor, hrefPath, type ActiveNav, type NavItem } from "@/lib/appNav";
import ThemeToggle from "./ThemeToggle";
import { goToOverviewSection, useSignOutFlow } from "./shellHooks";

interface Props {
  open: boolean;
  /** restoreFocus:false when handing off to a modal that must keep focus. */
  onClose: (opts?: { restoreFocus?: boolean }) => void;
  active: ActiveNav;
  /** Host's guest gate. Returns true when it intercepted the click. */
  gate: (e: React.MouseEvent, href: string) => boolean;
  onAction: (id: "settings") => void;
  /** Present only on /overview: its sections and the one in view (Phase 2.1). */
  overviewSections: { active: string | null; present: string[] } | null;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function MobileDrawer({ open, onClose, active, gate, onAction, overviewSections }: Props) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { requestSignOut, signOutModal } = useSignOutFlow();
  // Each time the drawer opens, only the group containing the current page
  // starts expanded. Adjusted during render (React's pattern for resetting
  // state when a prop changes), not in an effect.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(active.topId ? [active.topId] : []));
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setExpanded(new Set(active.topId ? [active.topId] : []));
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return <>{signOutModal}</>;

  function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (gate(e, href)) {
      onClose({ restoreFocus: false });
      return;
    }
    const hashIdx = href.indexOf("#");
    if (hashIdx !== -1 && hrefPath(href) === pathname) {
      e.preventDefault();
      const fragment = href.slice(hashIdx + 1);
      onClose();
      // After the drawer has unmounted and released the scroll lock.
      setTimeout(() => {
        document.getElementById(fragment)?.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", href);
      }, 0);
      return;
    }
    // Real navigation: let <Link> drive it; the host closes on pathname change.
    // A link to the current page (no pathname change) still needs closing.
    if (hrefPath(href) === pathname) setTimeout(onClose, 0);
  }

  function toggleGroup(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderItem(item: NavItem) {
    if (item.kind === "action") {
      return (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => {
              onClose({ restoreFocus: false });
              onAction(item.id);
            }}
            className="block w-full rounded-[var(--pe-radius-sm)] px-3 py-2 text-start text-[14px] text-pe-text-2 hover:bg-pe-surface-2"
          >
            {t(item.labelKey)}
          </button>
        </li>
      );
    }
    const current = ariaCurrentFor(active, item.id);
    return (
      <li key={item.id}>
        <Link
          href={item.href}
          aria-current={current}
          onClick={(e) => handleLinkClick(e, item.href)}
          className={`block rounded-[var(--pe-radius-sm)] px-3 py-2 text-[14px] hover:bg-pe-surface-2 ${current ? "font-medium text-pe-accent" : "text-pe-text-2"}`}
        >
          {item.labelKey ? t(item.labelKey) : item.label}
        </Link>
      </li>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-[rgba(8,22,43,0.55)]" aria-hidden="true" onClick={() => onClose()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-y-0 start-0 z-[60] flex w-[86vw] max-w-[340px] flex-col bg-pe-surface text-pe-text shadow-[var(--pe-shadow-pop)]"
      >
        <div className="flex h-[var(--app-header-h)] shrink-0 items-center justify-between bg-pe-nav px-3 text-pe-nav-text pe-on-nav">
          <p id={titleId} className="text-[17px] font-bold tracking-[0.04em]">
            PEIC
          </p>
          <button
            type="button"
            data-autofocus
            onClick={() => onClose()}
            aria-label={t("appNav.closeMenu")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--pe-radius)] hover:bg-pe-nav-raised"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <GlobalSearch onLinkClick={handleLinkClick} variant="surface" />

          <nav aria-label={t("appNav.mainNav")} className="mt-3">
            <ul className="flex flex-col">
              {PUBLIC_APP_NAV.map((entry) => {
                if (entry.kind === "link") {
                  const current = ariaCurrentFor(active, entry.id);
                  const showSections = entry.id === "overview" && overviewSections && overviewSections.present.length > 0;
                  const sectionsOpen = expanded.has("overview-sections");
                  const sectionsPanelId = `${titleId}-overview-sections`;
                  return (
                    <li key={entry.id}>
                      <Link
                        href={entry.href}
                        aria-current={current}
                        onClick={(e) => handleLinkClick(e, entry.href)}
                        className={`block rounded-[var(--pe-radius-sm)] px-3 py-2.5 text-[15px] font-medium hover:bg-pe-surface-2 ${current ? "text-pe-accent" : "text-pe-text"}`}
                      >
                        {t(entry.labelKey!)}
                      </Link>
                      {showSections && (
                        // Contextual "On this page" list for /overview — the
                        // retired sidebar's section index (Phase 2.1).
                        <div className="ps-2">
                          <button
                            type="button"
                            aria-expanded={sectionsOpen}
                            aria-controls={sectionsPanelId}
                            onClick={() => toggleGroup("overview-sections")}
                            className="flex w-full items-center justify-between rounded-[var(--pe-radius-sm)] px-3 py-2 text-start text-[13px] font-medium text-pe-text-2 hover:bg-pe-surface-2"
                          >
                            {t("appNav.onThisPage")}
                            <svg aria-hidden="true" className={`h-3 w-3 text-pe-text-3 transition-transform ${sectionsOpen ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 6l4 4 4-4" />
                            </svg>
                          </button>
                          <ul id={sectionsPanelId} hidden={!sectionsOpen} className="flex flex-col pb-1">
                            {OVERVIEW_SECTIONS.filter((s) => overviewSections!.present.includes(s.id)).map((s) => {
                              const here = s.id === overviewSections!.active;
                              return (
                                <li key={s.id}>
                                  <a
                                    href={`${OVERVIEW_PATH}#${s.id}`}
                                    aria-current={here ? "location" : undefined}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      onClose({ restoreFocus: false });
                                      // After the drawer releases its scroll lock.
                                      setTimeout(() => goToOverviewSection(s.id), 0);
                                    }}
                                    className={`block rounded-[var(--pe-radius-sm)] px-3 py-1.5 text-[14px] hover:bg-pe-surface-2 ${here ? "font-medium text-pe-accent" : "text-pe-text-2"}`}
                                  >
                                    {t(s.labelKey)}
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                }
                const isOpen = expanded.has(entry.id);
                const groupPanelId = `${titleId}-${entry.id}`;
                return (
                  <li key={entry.id} className="border-t border-pe-border first:border-t-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={groupPanelId}
                      onClick={() => toggleGroup(entry.id)}
                      className="flex w-full items-center justify-between rounded-[var(--pe-radius-sm)] px-3 py-2.5 text-start text-[15px] font-medium text-pe-text hover:bg-pe-surface-2"
                    >
                      <span>
                        {t(entry.labelKey)}
                        {active.topId === entry.id && <span className="sr-only">, {t("appNav.currentSection")}</span>}
                      </span>
                      <svg aria-hidden="true" className={`h-3.5 w-3.5 text-pe-text-3 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </button>
                    <div id={groupPanelId} hidden={!isOpen} className="pb-2 ps-2">
                      {entry.groups.map((group) => (
                        <div key={group.id} className="mt-1">
                          {group.labelKey && (
                            <p className="px-3 pb-0.5 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-pe-text-3">{t(group.labelKey)}</p>
                          )}
                          <ul className="flex flex-col">{group.items.map(renderItem)}</ul>
                        </div>
                      ))}
                      {entry.footer && <ul>{renderItem(entry.footer)}</ul>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="shrink-0 border-t border-pe-border px-3 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-pe-text-2">{t("appNav.darkMode")}</span>
            <ThemeToggle className="border border-pe-border text-pe-text-2 hover:bg-pe-surface-2" />
          </div>
          {ACCOUNT_UI_ENABLED && !loading && (
            <div className="mt-3">
              {user ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[12px] text-pe-text-2">{user.email}</p>
                  <button
                    type="button"
                    data-cta="logout"
                    data-cta-source="drawer"
                    onClick={() => {
                      onClose({ restoreFocus: false });
                      requestSignOut();
                    }}
                    className="shrink-0 rounded-[var(--pe-radius)] border border-pe-border px-3 py-1.5 text-[13px] font-medium text-pe-text-2 hover:bg-pe-surface-2"
                  >
                    {t("common.logout")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    data-cta="login"
                    data-cta-source="drawer"
                    className="flex-1 rounded-[var(--pe-radius)] border border-pe-border px-3 py-2 text-center text-[14px] font-medium text-pe-text"
                  >
                    {t("common.login")}
                  </Link>
                  <Link
                    href="/signup"
                    data-cta="signup"
                    data-cta-source="drawer"
                    className="flex-1 rounded-[var(--pe-radius)] bg-pe-accent px-3 py-2 text-center text-[14px] font-semibold text-pe-surface"
                  >
                    {t("common.signup")}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {signOutModal}
    </>
  );
}
