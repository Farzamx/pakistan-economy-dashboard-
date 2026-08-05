"use client";

// Phase M1 §10 — "tap to enlarge" for phones. Wraps any chart (passed as
// children) with a small expand affordance, mobile-only (a mouse/trackpad
// user on desktop already has plenty of room). Renders the same chart
// element a second time inside a full-width modal when opened — this
// duplicates the chart's own render, same trade-off already accepted for
// PinnedIndicatorsRow/MobileCollapsibleGroup this phase — but each
// TrendLineChart instance is itself lazy (only renders once its own
// container scrolls into view), so the modal copy's real cost is paid
// only if a visitor actually opens it. Modal shape matches
// GuestAccessModal.tsx's center-anchored variant, sized wider for a chart.
//
// Applied to the homepage's highest-traffic charts first (GDP, Reserves,
// Inflation, Exchange Rate) — the remaining TrendLineChart instances
// across the site don't have this yet; a documented follow-up, not a
// silent gap.
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  title: string;
  children: ReactNode;
}

const BACKDROP = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const PANEL = { hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1 } };

export default function ChartExpandButton({ title, children }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge ${title} chart`}
        title="Enlarge chart"
        className="glass-card absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-white/60 light:text-slate-500 min-[800px]:hidden"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>

      {children}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="chart-expand-backdrop"
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm min-[800px]:hidden"
              variants={BACKDROP}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-3 min-[800px]:hidden">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={`${title} — enlarged`}
                className="glass-card pointer-events-auto w-full max-w-full rounded-2xl p-3"
                variants={PANEL}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white light:text-slate-900">{title}</p>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 light:text-slate-400 hover:bg-white/5">
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 2l12 12M14 2L2 14" />
                    </svg>
                  </button>
                </div>
                {children}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
