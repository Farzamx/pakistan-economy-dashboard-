"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
}

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const PANEL = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export default function PsxComingSoonModal({ open, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="psx-backdrop"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            variants={BACKDROP}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="psx-panel"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="PSX — Coming Soon"
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-2xl"
              variants={PANEL}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  aria-label="Close"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 2l12 12M14 2L2 14" />
                  </svg>
                </button>
              </div>

              {/* Icon */}
              <div className="mx-auto -mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-blue/20 bg-neon-blue/10">
                <svg className="h-7 w-7 text-neon-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17l5-5 4 4 6-7" />
                  <path d="M14 9h5v5" />
                </svg>
              </div>

              {/* Badge */}
              <span className="mt-5 inline-flex items-center rounded-full border border-neon-blue/20 bg-neon-blue/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-neon-blue/80">
                Coming Soon
              </span>

              {/* Title */}
              <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                Pakistan Stock Exchange (PSX)
              </h2>

              {/* Body */}
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                This feature is currently under development.
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Live PSX index tracking and market analytics will be available in a future update.
              </p>

              {/* Footer */}
              <div className="mt-7 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-sky-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
