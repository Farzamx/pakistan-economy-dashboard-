"use client";

// Shown instead of navigating when a signed-out visitor clicks Comparisons,
// Budget Tracker, or Provincial Budget in the Sidebar — same
// AnimatePresence/backdrop/panel shape as PsxComingSoonModal.tsx and
// SettingsModal.tsx, so it feels native to the rest of the dashboard rather
// than like a bolted-on auth library's default UI. proxy.ts is still the
// real enforcement (direct URL visits without this modal still redirect to
// /login) — this is purely the better-UX path for the common case.

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The section the visitor was trying to reach — carried through to /login and /signup as ?redirect= so they land back here after authenticating, instead of the homepage. */
  destination: string;
}

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const PANEL = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

const BENEFITS = [
  "Access Budget Workshops",
  "Compare Economic Indicators",
  "Provincial Budget Intelligence",
  "Save Preferences",
  "Future Premium Features",
];

export default function GuestAccessModal({ open, onClose, destination }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const redirectQuery = `?redirect=${encodeURIComponent(destination)}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="guest-access-backdrop"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            variants={BACKDROP}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div key="guest-access-panel" className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Create Free Account"
              className="glass-card pointer-events-auto w-full max-w-md rounded-2xl border-neon-blue/20 p-8 text-center shadow-[0_0_50px_rgba(56,189,248,0.18)]"
              variants={PANEL}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
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

              <div className="mx-auto -mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-blue/20 bg-neon-blue/10">
                <svg className="h-7 w-7 text-neon-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                  <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
                </svg>
              </div>

              <h2 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">Create Free Account</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Sign in or create a free account to continue.</p>

              <ul className="mx-auto mt-5 flex max-w-xs flex-col gap-2 text-left">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                    <span className="text-emerald-400">✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href={`/login${redirectQuery}`}
                  className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  Log In
                </Link>
                <Link
                  href={`/signup${redirectQuery}`}
                  className="flex-1 rounded-xl bg-neon-blue px-4 py-2.5 text-sm font-semibold text-[#05060f] transition-opacity hover:opacity-90"
                >
                  Sign Up
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
