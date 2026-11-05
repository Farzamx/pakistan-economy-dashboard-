"use client";

// Desktop dropdown for a top-level navigation group (PEIC redesign Phase 2).
//
// Disclosure pattern (button + aria-expanded/aria-controls + plain links),
// not the ARIA "menu" role: these are site-navigation links, and role=menu
// would make screen readers switch to application-menu semantics that don't
// fit. Keyboard: Enter/Space toggles; ArrowDown on the button opens and moves
// into the panel; ArrowUp/ArrowDown/Home/End move within it; Escape closes and
// returns focus to the button; tabbing out closes it.
//
// Opens on click only, not hover — a hover-opened panel with a 0.3s gap is a
// motor-accessibility trap, and on touch laptops hover doesn't exist.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { ariaCurrentFor, type ActiveNav, type NavItem, type TopNavEntry } from "@/lib/appNav";
import { handleMenuArrowKeys, useDismiss } from "./shellHooks";

type MenuEntry = Extract<TopNavEntry, { kind: "menu" }>;

interface Props {
  entry: MenuEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: ActiveNav;
  /** Host's click handler (guest gate). Returns true when it intercepted the click. */
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => boolean;
  onAction: (id: "settings") => void;
}

export default function NavMenu({ entry, open, onOpenChange, active, onLinkClick, onAction }: Props) {
  const { t } = useLanguage();
  const panelId = useId();
  const containerRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [focusFirstOnOpen, setFocusFirstOnOpen] = useState(false);
  const isCurrent = active.topId === entry.id;
  const wide = entry.groups.length > 1;

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  useDismiss(open, close, containerRef, buttonRef);

  useEffect(() => {
    if (!open || !focusFirstOnOpen) return;
    panelRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
    // Consumed — reset so a later mouse-open doesn't steal focus.
    const id = setTimeout(() => setFocusFirstOnOpen(false), 0);
    return () => clearTimeout(id);
  }, [open, focusFirstOnOpen]);

  function handleItemClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (onLinkClick(e, href)) {
      close();
      return;
    }
    // Deferred, not synchronous: closing unmounts the panel, and unmounting
    // the clicked <a> in the same tick can swallow <Link>'s navigation (the
    // race documented in MobileNav.tsx). A route change also closes it.
    setTimeout(close, 0);
  }

  function renderItem(item: NavItem) {
    if (item.kind === "action") {
      return (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => {
              close();
              onAction(item.id);
            }}
            className="block w-full rounded-[var(--pe-radius-sm)] px-2.5 py-1.5 text-start text-[13px] text-pe-text-2 hover:bg-pe-surface-2 hover:text-pe-text"
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
          onClick={(e) => handleItemClick(e, item.href)}
          className={`block rounded-[var(--pe-radius-sm)] px-2.5 py-1.5 text-[13px] leading-snug hover:bg-pe-surface-2 ${
            current ? "font-medium text-pe-accent" : "text-pe-text-2 hover:text-pe-text"
          }`}
        >
          {item.labelKey ? t(item.labelKey) : item.label}
        </Link>
      </li>
    );
  }

  return (
    // Wide (multi-group) panels are positioned against the header bar, not
    // this <li>, so they can span the bar instead of overflowing the viewport.
    <li ref={containerRef} className={`flex h-full items-stretch ${wide ? "" : "relative"}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusFirstOnOpen(true);
            onOpenChange(true);
          }
        }}
        className={`relative flex items-center gap-1 px-3 text-[14px] font-medium transition-colors ${
          open ? "bg-pe-nav-raised text-pe-nav-text" : isCurrent ? "text-pe-nav-text" : "text-pe-nav-text-muted hover:text-pe-nav-text"
        }`}
      >
        {t(entry.labelKey)}
        {isCurrent && <span className="sr-only">, {t("appNav.currentSection")}</span>}
        <svg aria-hidden="true" className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
        {isCurrent && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 bg-pe-nav-accent" />}
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        onKeyDown={handleMenuArrowKeys}
        className={`pe-panel absolute top-full z-10 mt-px rounded-b-[var(--pe-radius)] border border-pe-border bg-pe-surface p-3 text-pe-text shadow-[var(--pe-shadow-pop)] ${
          // Physical left/right on purpose (centring is symmetric, so it is
          // correct in RTL too) — mixing them with logical start/end utilities
          // would leave which inset wins up to stylesheet order.
          wide ? "left-2 right-2 xl:left-1/2 xl:right-auto xl:w-[1040px] xl:-translate-x-1/2" : "start-0 w-60"
        }`}
      >
        <div className={wide ? "grid grid-cols-3 gap-x-4 gap-y-3 xl:grid-cols-6" : ""}>
          {entry.groups.map((group) => {
            const headingId = `${panelId}-${group.id}`;
            return (
              <div key={group.id} className="min-w-0">
                {group.labelKey && (
                  <p id={headingId} className="mb-1 border-b border-pe-border px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-pe-text-3">
                    {t(group.labelKey)}
                  </p>
                )}
                <ul aria-labelledby={group.labelKey ? headingId : undefined} className="flex flex-col">
                  {group.items.map(renderItem)}
                </ul>
              </div>
            );
          })}
        </div>
        {entry.footer && (
          <div className="mt-3 border-t border-pe-border pt-2">
            <Link
              href={entry.footer.href}
              aria-current={ariaCurrentFor(active, entry.footer.id)}
              onClick={(e) => handleItemClick(e, entry.footer!.href)}
              className="inline-flex items-center gap-1 rounded-[var(--pe-radius-sm)] px-2.5 py-1.5 text-[13px] font-medium text-pe-accent hover:underline"
            >
              {entry.footer.labelKey ? t(entry.footer.labelKey) : entry.footer.label}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </li>
  );
}
