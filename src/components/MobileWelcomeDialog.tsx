"use client";

// Phase M1 §12 — one-time "Best Experience on Desktop" dialog. Same
// AnimatePresence backdrop/panel shape as GuestAccessModal.tsx (center-
// anchored variant), no `open`/`onClose` props — this manages its own
// visibility since nothing else needs to control it, mounted once
// directly in layout.tsx like ProfileCompletionDrawer.
//
// Persistence: "Continue on Mobile" sets a PERMANENT localStorage flag —
// never shown again on this browser. "Remind Me Later" sets a
// sessionStorage flag instead — won't re-nag again this session, but
// reappears on the visitor's next fresh session since sessionStorage
// clears when the tab/browser closes. Shown only when window.innerWidth
// is below the same min-[800px] nav-chrome cutover used everywhere else
// in this phase, checked once on mount (a real side effect reading
// browser-only APIs, same category of exception the codebase already
// uses for economicProfile.ts's migration-flag guard) — defaults to
// closed during SSR/hydration, so there's no mismatch.
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";

const DISMISS_KEY = "peic-mobile-welcome-dismissed";
const SNOOZE_KEY = "peic-mobile-welcome-snoozed";

const BACKDROP = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const PANEL = { hidden: { opacity: 0, scale: 0.95, y: 8 }, visible: { opacity: 1, scale: 1, y: 0 } };

// Read once via useSyncExternalStore rather than useEffect+setState (this
// codebase's own react-hooks/set-state-in-effect rule flags the latter,
// same pattern already established in profileDrawerStore.ts) — the
// subscribe function never fires, since this is a one-shot "what does the
// browser look like right now" read, not a value that needs to stay live.
function getShouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth >= 800) return false;
  if (window.localStorage.getItem(DISMISS_KEY) === "1") return false;
  if (window.sessionStorage.getItem(SNOOZE_KEY) === "1") return false;
  return true;
}
function subscribeNoop() {
  return () => {};
}
function getServerSnapshot() {
  return false;
}

export default function MobileWelcomeDialog() {
  const shouldShow = useSyncExternalStore(subscribeNoop, getShouldShow, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const open = shouldShow && !dismissed;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleRemindLater();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleContinue() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  function handleRemindLater() {
    window.sessionStorage.setItem(SNOOZE_KEY, "1");
    setDismissed(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="mobile-welcome-backdrop"
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm min-[800px]:hidden"
            variants={BACKDROP}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={handleRemindLater}
          />

          <motion.div key="mobile-welcome-panel" className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4 min-[800px]:hidden">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Best Experience on Desktop"
              className="glass-card pointer-events-auto w-full max-w-sm rounded-2xl border-neon-blue/20 p-6 text-center shadow-[0_0_50px_rgba(56,189,248,0.18)]"
              variants={PANEL}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-neon-blue/20 bg-neon-blue/10">
                <svg className="h-6 w-6 text-neon-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="13" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              </div>

              <h2 className="mt-4 text-base font-semibold text-white light:text-slate-900">Best Experience on Desktop</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60 light:text-slate-500">
                Pakistan Economic Intelligence Center contains advanced dashboards and professional analytical tools.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/60 light:text-slate-500">
                For the complete institutional experience we recommend using a desktop or laptop.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/40 light:text-slate-400">You can continue on mobile at any time.</p>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleContinue}
                  className="rounded-xl bg-neon-blue px-4 py-2.5 text-sm font-semibold text-[#05060f] transition-opacity hover:opacity-90"
                >
                  Continue on Mobile
                </button>
                <button
                  type="button"
                  onClick={handleRemindLater}
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-white/80 light:text-slate-700 transition-colors hover:bg-white/5 light:hover:bg-slate-100"
                >
                  Remind Me Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
