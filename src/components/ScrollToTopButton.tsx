"use client";

// Phase M1 §5 — didn't exist before. Mobile-only (a desktop pointer can
// already reach the top of a long page trivially; a thumb scrolling
// through the homepage's long indicator list cannot). Deliberately
// bottom-LEFT — CreatorBadge and MobileStickyCta both already live in the
// bottom-right/center, so this claims the one corner nothing else uses
// rather than adding a fourth element to an already-crowded one.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight * 0.6);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          title="Scroll to top"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="glass-card fixed bottom-3 left-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border-white/10 text-white/70 light:text-slate-600 shadow-lg min-[800px]:hidden"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
