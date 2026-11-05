"use client";

// The "Overview" entry of the desktop bar while ON /overview (redesign
// Phase 2.1): the link itself plus a small button that opens an
// "On this page" list of the dashboard's sections, with the section in view
// marked. This is the contextual navigation the retired sidebar used to
// provide (its scroll-spy tree), folded into the bar so it costs ~20px of
// width instead of a 256px column. Everywhere else, Overview is a plain link.
//
// Two separate controls rather than one: the link must still go to
// /overview (aria-current="page"), and the button is a disclosure for the
// list — combining them would make one of the two unreachable by keyboard.

import { useCallback, useId, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { OVERVIEW_PATH, OVERVIEW_SECTIONS } from "@/lib/appNav";
import { goToOverviewSection, handleMenuArrowKeys, useDismiss } from "./shellHooks";

interface Props {
  labelKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: { active: string | null; present: string[] };
}

export default function OverviewNavItem({ labelKey, open, onOpenChange, sections }: Props) {
  const { t } = useLanguage();
  const panelId = useId();
  const containerRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  useDismiss(open, close, containerRef, buttonRef);

  const visible = OVERVIEW_SECTIONS.filter((s) => sections.present.includes(s.id));

  return (
    <li ref={containerRef} className="relative flex h-full items-stretch">
      <Link
        href={OVERVIEW_PATH}
        aria-current="page"
        onClick={close}
        className="relative flex items-center whitespace-nowrap pe-1 ps-3 text-[14px] font-medium text-pe-nav-text"
      >
        {t(labelKey)}
        <span aria-hidden="true" className="absolute bottom-0 end-1 start-3 h-0.5 bg-pe-nav-accent" />
      </Link>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("appNav.onThisPage")}
        title={t("appNav.onThisPage")}
        onClick={() => onOpenChange(!open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            onOpenChange(true);
            requestAnimationFrame(() => document.getElementById(panelId)?.querySelector<HTMLElement>("a[href]")?.focus());
          }
        }}
        className={`flex items-center pe-2.5 ps-1 text-pe-nav-text-muted transition-colors hover:text-pe-nav-text ${open ? "bg-pe-nav-raised text-pe-nav-text" : ""}`}
      >
        <svg aria-hidden="true" className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      <div
        id={panelId}
        hidden={!open}
        onKeyDown={handleMenuArrowKeys}
        className="pe-panel absolute start-0 top-full z-10 mt-px max-h-[calc(100vh-5rem)] w-64 overflow-y-auto rounded-b-[var(--pe-radius)] border border-pe-border bg-pe-surface p-2 text-pe-text shadow-[var(--pe-shadow-pop)]"
      >
        <p className="mb-1 border-b border-pe-border px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-pe-text-3">
          {t("appNav.onThisPage")}
        </p>
        <ul className="flex flex-col">
          {visible.map((s) => {
            const current = s.id === sections.active;
            return (
              <li key={s.id}>
                <a
                  href={`${OVERVIEW_PATH}#${s.id}`}
                  aria-current={current ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    close();
                    goToOverviewSection(s.id);
                  }}
                  className={`flex items-center gap-2 rounded-[var(--pe-radius-sm)] px-2.5 py-1.5 text-[13px] hover:bg-pe-surface-2 ${
                    current ? "font-medium text-pe-accent" : "text-pe-text-2 hover:text-pe-text"
                  }`}
                >
                  <span aria-hidden="true" className={`h-3.5 w-0.5 shrink-0 rounded-full ${current ? "bg-pe-accent" : "bg-transparent"}`} />
                  {t(s.labelKey)}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}
