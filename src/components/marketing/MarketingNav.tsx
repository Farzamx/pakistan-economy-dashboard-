"use client";

// Marketing site nav — transparent over the hero, solidifies on scroll.
// Desktop: wordmark / centered links / quiet "Sign in". Mobile: wordmark +
// hamburger opening a full-screen drawer (focus-trapped, scroll-locked,
// Escape/backdrop-dismissible), matching the pattern the app's own
// MobileNav.tsx already uses for the same interaction, kept independent
// since this nav's links and styling are entirely marketing-specific.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Platform", href: "/overview" },
  // ?section= is read by proxy.ts to exempt this link from the returning-
  // visitor redirect on "/" — see its comment for why the "#data-sources"
  // fragment alone can't do that job (fragments never reach the server).
  { label: "Data", href: "/?section=data-sources#data-sources" },
  { label: "Methodology", href: "/methodology" },
  { label: "About", href: "/about" },
];

const SCROLL_THRESHOLD = 80;

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > SCROLL_THRESHOLD);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>("a, button");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-5 transition-colors duration-200 min-[1024px]:px-10 ${
        scrolled ? "border-b border-[var(--ink-raised)] bg-[var(--ink)]" : "border-b border-transparent bg-transparent"
      }`}
    >
      {/* /home, not "/" — so a returning visitor (whose cookie would
          otherwise redirect "/" straight to /overview, see src/proxy.ts)
          can always reach the landing page from its own nav. */}
      <Link href="/home" className="font-marketing-display text-lg font-extrabold tracking-tight text-[var(--paper)]" style={{ fontFamily: "var(--font-marketing-display)" }}>
        PEIC
      </Link>

      {/* Desktop links */}
      <nav aria-label="Primary" className="hidden items-center gap-8 min-[1024px]:flex" style={{ fontFamily: "var(--font-marketing-body)" }}>
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-sm font-medium text-[var(--paper)]/80 transition-colors hover:text-[var(--paper)]">
            {link.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/login"
        className="hidden text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--paper)] min-[1024px]:block"
        style={{ fontFamily: "var(--font-marketing-body)" }}
      >
        Sign in
      </Link>

      {/* Mobile hamburger */}
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="marketing-mobile-drawer"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--paper)] min-[1024px]:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile full-screen drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] min-[1024px]:hidden">
          <div className="mkt-drawer-backdrop absolute inset-0 bg-[var(--ink)]/80" onClick={closeDrawer} />
          <div
            id="marketing-mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="mkt-drawer-panel absolute inset-0 flex flex-col bg-[var(--ink)] px-6"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold tracking-tight text-[var(--paper)]" style={{ fontFamily: "var(--font-marketing-display)" }}>
                PEIC
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeDrawer}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--paper)]"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav aria-label="Primary" className="mt-10 flex flex-col gap-1" style={{ fontFamily: "var(--font-marketing-body)" }}>
              {NAV_LINKS.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  ref={i === 0 ? firstLinkRef : undefined}
                  onClick={closeDrawer}
                  className="min-h-[44px] py-3 text-[20px] font-medium text-[var(--paper)]"
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/login" onClick={closeDrawer} className="min-h-[44px] py-3 text-[20px] font-medium text-[var(--muted)]">
                Sign in
              </Link>
              <Link
                href="/overview"
                onClick={closeDrawer}
                className="mt-4 flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--indigo)] px-5 py-3 text-[17px] font-semibold text-[var(--paper)]"
              >
                Open the platform
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
