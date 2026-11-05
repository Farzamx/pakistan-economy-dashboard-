"use client";

// Header account control (PEIC redesign Phase 2) — replaces the sidebar's
// SidebarAuthCard and the old TopNav's "Log in" button.
//
// Guests get a single "Log in" link. There is deliberately no second "Sign
// up" button here: pages already carry their own sign-up call to action (the
// overview Hero, MobileStickyCta on phones), and the old shell showed three
// at once (sidebar card + Hero + nav). Sign-up stays one click away from the
// login page and the mobile drawer.
//
// Signed-in users get a disclosure menu: email, Settings, Sign out (with the
// existing confirmation modal and sign-out sequence — see useSignOutFlow).

import { useCallback, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { handleMenuArrowKeys, useDismiss, useSignOutFlow } from "./shellHooks";

export default function AccountControl() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, containerRef, buttonRef);
  const { requestSignOut, signOutModal } = useSignOutFlow();

  if (loading) {
    // Reserves the guest button's width so the bar doesn't shift on load.
    return <div aria-hidden="true" className="h-8 w-[68px]" />;
  }

  if (!user) {
    // Phase 2.1 review: on the login page this would link to itself, and on
    // the sign-up page it competes with the form the visitor came for. The
    // pages carry their own Log in / Create account cross-links.
    if (pathname === "/login" || pathname === "/signup") return null;
    return (
      <Link
        href="/login"
        data-cta="login"
        data-cta-source="header"
        className="inline-flex h-8 items-center whitespace-nowrap rounded-[var(--pe-radius)] border border-pe-nav-border px-3 text-[13px] font-medium text-pe-nav-text transition-colors hover:bg-pe-nav-raised"
      >
        {t("common.login")}
      </Link>
    );
  }

  const initial = (user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${t("appNav.account")}: ${user.email ?? ""}`}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-pe-nav-border text-[13px] font-semibold text-pe-nav-text transition-colors hover:bg-pe-nav-raised ${open ? "bg-pe-nav-raised" : ""}`}
      >
        <span aria-hidden="true">{initial}</span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        onKeyDown={handleMenuArrowKeys}
        className="pe-panel absolute end-0 top-full z-10 mt-2 w-64 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-2 text-pe-text shadow-[var(--pe-shadow-pop)]"
      >
        <p className="truncate border-b border-pe-border px-2.5 pb-2 pt-1 text-[12px] text-pe-text-2">{user.email}</p>
        <ul className="mt-1 flex flex-col">
          <li>
            <Link
              href="/settings/preferences"
              onClick={() => setTimeout(close, 0)}
              className="block rounded-[var(--pe-radius-sm)] px-2.5 py-1.5 text-[13px] text-pe-text-2 hover:bg-pe-surface-2 hover:text-pe-text"
            >
              {t("nav.settings")}
            </Link>
          </li>
          <li>
            <button
              type="button"
              data-cta="logout"
              data-cta-source="header"
              onClick={() => {
                close();
                requestSignOut();
              }}
              className="block w-full rounded-[var(--pe-radius-sm)] px-2.5 py-1.5 text-start text-[13px] text-pe-text-2 hover:bg-pe-surface-2 hover:text-pe-text"
            >
              {t("common.logout")}
            </button>
          </li>
        </ul>
      </div>
      {signOutModal}
    </div>
  );
}
