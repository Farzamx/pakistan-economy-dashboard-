"use client";

// Confirmation step shown before SidebarAuthCard.tsx/MobileNav.tsx actually
// sign the user out — same AnimatePresence/backdrop/panel shape as
// GuestAccessModal.tsx/PsxComingSoonModal.tsx/SettingsModal.tsx, so it feels
// native rather than a one-off. Doesn't touch the sign-out logic itself:
// `onConfirm` is just whichever existing handleSignOut the caller already
// had — this only adds a `loading` flag the caller sets while that existing
// async call is in flight, so the button can show a spinner instead of
// going dead/unresponsive.
//
// Deliberately NOT using the shared `.glass-card` class here (unlike the
// three sibling modals above) — that class is only ~4% opaque in dark mode
// (relies on backdrop-blur to read as "frosted"), which left dashboard
// content visibly bleeding through a confirmation dialog. A solid,
// near-opaque panel reads as more deliberate for a "you're about to leave"
// prompt specifically, without touching `.glass-card` itself and affecting
// every other modal/card that depends on its current translucency.

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** True while the caller's onConfirm (the actual sign-out) is in flight — disables both buttons and swaps Logout's label for a spinner. */
  loading?: boolean;
}

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const PANEL = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function LogoutConfirmModal({ open, onClose, onConfirm, loading = false }: Props) {
  // Close on Escape — suppressed while signing out so it can't be
  // dismissed mid-request and leave the caller's loading state dangling.
  useEffect(() => {
    if (!open || loading) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  // Prevent body scroll while modal is open
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

  function handleBackdropClick() {
    if (loading) return;
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="logout-confirm-backdrop"
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
            variants={BACKDROP}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
          />

          <motion.div key="logout-confirm-panel" className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Sign out?"
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-neon-blue/30 light:border-slate-200 bg-[#070912] light:bg-white p-8 text-center shadow-[0_0_60px_rgba(56,189,248,0.22),0_25px_60px_-12px_rgba(0,0,0,0.85)] light:shadow-2xl"
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
                  disabled={loading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Close"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 2l12 12M14 2L2 14" />
                  </svg>
                </button>
              </div>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-blue/20 bg-neon-blue/10">
                <svg className="h-7 w-7 text-neon-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </div>

              <h2 className="mt-6 text-xl font-bold text-[var(--text-primary)]">Sign out?</h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[var(--text-muted)]">
                Are you sure you want to log out of your Pakistan Economic Intelligence Dashboard?
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-white/10 bg-[#13151f] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1b1e2c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:pointer-events-none disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neon-blue px-4 py-2.5 text-sm font-semibold text-[#05060f] transition-all duration-150 hover:bg-sky-400 hover:shadow-[0_0_24px_rgba(56,189,248,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-blue/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070912] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-70"
                >
                  {loading && <Spinner />}
                  {loading ? "Logging out…" : "Logout"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
