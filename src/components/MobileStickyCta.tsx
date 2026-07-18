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

  const hiddenHere = HIDDEN_ON.some((p) => pathname?.startsWith(p));
  const show = !loading && !user && !hiddenHere && scrolledPast;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          // bottom-20 (not bottom-4) — verified live that CreatorBadge
          // (fixed bottom-3/5 right-3/5, "Farzam Arif · Economic
          // Intelligence Dashboard") spans most of the viewport width at
          // mobile sizes and would otherwise sit directly underneath this
          // button, overlapping it.
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
