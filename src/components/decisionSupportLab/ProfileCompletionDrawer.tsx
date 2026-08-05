"use client";

// Persistent, collapsible profile drawer (Section A3 / B5) — mounted once
// in the decision-support-lab layout so it's reachable from every tool
// page without losing that tool's own input state (it overlays, it never
// navigates away). Opened via openProfileDrawer() from anywhere, e.g. a
// ConfidenceBadge "Incomplete profile" chip, with an optional field id to
// scroll to, open the containing <details> section for, and focus.
import { useEffect, useRef } from "react";
import { useProfileDrawer, closeProfileDrawer } from "@/lib/decisionSupportLab/profileDrawerStore";
import EconomicProfileOnboarding from "@/components/decisionSupportLab/EconomicProfileOnboarding";

export default function ProfileCompletionDrawer() {
  const { open, highlightFieldId } = useProfileDrawer();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeProfileDrawer();
    }
    document.addEventListener("keydown", onKeyDown);

    const raf = requestAnimationFrame(() => {
      if (!highlightFieldId) {
        panelRef.current?.focus();
        return;
      }
      const field = document.getElementById(highlightFieldId);
      if (!field) {
        panelRef.current?.focus();
        return;
      }
      const details = field.closest("details");
      if (details instanceof HTMLDetailsElement) details.open = true;
      field.scrollIntoView({ block: "center", behavior: "smooth" });
      if (field instanceof HTMLElement) field.focus();
      field.classList.add("profile-field-highlight");
      window.setTimeout(() => field.classList.remove("profile-field-highlight"), 2200);
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
    };
  }, [open, highlightFieldId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close profile drawer" onClick={closeProfileDrawer} className="absolute inset-0 bg-black/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Your Economic Profile"
        tabIndex={-1}
        className="profile-drawer-panel relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 shadow-2xl outline-none sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white light:text-slate-900">Complete your profile</p>
          <button
            type="button"
            onClick={closeProfileDrawer}
            aria-label="Close"
            className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white light:text-slate-500 light:hover:bg-slate-100"
          >
            Close ✕
          </button>
        </div>
        <EconomicProfileOnboarding />
      </div>
    </div>
  );
}
