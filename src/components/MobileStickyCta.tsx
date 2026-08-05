"use client";

// Mobile sticky signup CTA (Auth UX Enhancement) — audited before building:
// the Hero CTA (HeroAuthCta.tsx) already gives guests a no-scroll-required
// signup entry point, and the MobileNav drawer already has one a tap away,
// so a CTA that's visible immediately on load would just be a third
// duplicate of the same offer. The actual gap is a *scrolled-down* user —
// someone reading a chart or indicator page who never sees the top of the
// page again. Scoped narrowly to avoid adding a third permanently-visible
// floating element on top of the existing CreatorBadge (bottom-right) and
// FloatingAssistant (draggable, bottom-right-ish): bottom-CENTER position,
// only appears after scrolling past one viewport height, guests only,
// hidden on the auth pages themselves (a "create account" prompt on the
// signup page is just noise). Its own file/data attributes for the same
// future-analytics reason as HeroAuthCta.tsx and SidebarAuthCard.tsx.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/components/LanguageProvider";

const HIDDEN_ON = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default function MobileStickyCta() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [scrolledPast, setScrolledPast] = useState(false);
  // Phase M1 — found live via a Playwright screenshot pass: this fixed
  // CTA and the new mobile Quick Actions/Pinned Indicators block (moved
  // up near the Hero in this same phase) land at the same screen height
  // for some scroll positions, so the CTA was drawing over that
  // section's header text. An IntersectionObserver on that block — not
  // a wider scroll-threshold — is the correct fix, since scrolledPast
  // alone can't know THIS specific section is currently on screen.
  const [overQuickActions, setOverQuickActions] = useState(false);

  useEffect(() => {
    // No explicit "reset to false" on navigation — onScroll() below runs
    // immediately and computes the correct value from the new page's
    // actual scroll position (0 on a fresh navigation) anyway. Calling
    // setState directly in the effect body (rather than from this
    // listener callback) trips the same purity rule fixed earlier in
    // MobileNav.tsx.
    function onScroll() {
      setScrolledPast(window.scrollY > window.innerHeight * 0.8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    let intersectionObserver: IntersectionObserver | null = null;
    let observedNode: Element | null = null;

    function syncTarget() {
      const target = document.getElementById("mobile-quick-actions");
      if (target === observedNode) return;
      // The homepage's heavy async content can cause this node to be
      // replaced (not just mutated) as it streams/resolves — confirmed
      // live: an IntersectionObserver attached to an early instance never
      // fired again once React swapped it for the final one. Re-observing
      // whenever the live element differs from what we last attached to
      // (including transitioning to null, e.g. on route change) keeps
      // this correct regardless of how many times that happens.
      intersectionObserver?.disconnect();
      observedNode = target;
      if (!target) {
        setOverQuickActions(false);
        return;
      }
      intersectionObserver = new IntersectionObserver(([entry]) => setOverQuickActions(entry.isIntersecting));
      intersectionObserver.observe(target);
    }

    syncTarget();
    const mutationObserver = new MutationObserver(syncTarget);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [pathname]);

  const hiddenHere = HIDDEN_ON.some((p) => pathname?.startsWith(p));
  const show = !loading && !user && !hiddenHere && scrolledPast && !overQuickActions;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          // bottom-20 (not bottom-4) keeps this well clear of the bottom
          // edge, where CreatorBadge (bottom-right) and the Phase M1
          // scroll-to-top button (bottom-left) both now live — confirmed
          // via a real Playwright screenshot pass (320-430px, portrait +
          // landscape): no overlap at bottom-20 at any tested width.
          className="fixed inset-x-4 bottom-20 z-50 flex justify-center min-[800px]:hidden"
        >
          <Link
            href="/signup"
            data-cta="signup"
            data-cta-source="mobile-sticky"
            className="flex items-center gap-2 rounded-md bg-neon-blue px-5 py-3 text-sm font-semibold text-[#05060f] shadow-lg light:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
            </svg>
            {t("hero.createAccount")}
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
