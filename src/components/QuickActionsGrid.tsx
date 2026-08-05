"use client";

// Phase M1 §1/§2/§3 — a banking-app-style quick action row for mobile
// only. Distinct from PinnedIndicatorsRow (data shortcuts) — these are
// APP-LEVEL actions, closing the "no Settings on mobile" gap and giving
// mobile users the same one-tap access a banking app's action tray gives.
// Reuses ProtectedLink (not a new gate) for the two protected
// destinations (Settings, Economic Calendar — see protectedSections.ts);
// Decision Support Lab's landing page itself isn't gated, so a plain Link
// is correct there, matching how MobileNav treats the same destination.
import Link from "next/link";
import ProtectedLink from "@/components/ProtectedLink";
import { useLanguage } from "@/components/LanguageProvider";

function SearchIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function DecisionLabIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function openMobileNavDrawer() {
  // Deliberately not lifting MobileNav's carefully-debugged local `open`
  // state into a shared store just for this one cross-component nudge —
  // its trigger button already has a stable, meaningful aria-label, so a
  // synthetic click is the lowest-risk way to open the drawer (where
  // GlobalSearch already lives) without touching that component's state.
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="Open navigation menu"]');
  trigger?.click();
}

function ActionTile({ label, icon, onClick, href, protectedRoute }: { label: string; icon: React.ReactNode; onClick?: () => void; href?: string; protectedRoute?: boolean }) {
  const inner = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 light:border-slate-200 bg-white/[0.03] light:bg-slate-50 text-neon-blue">{icon}</span>
      <span className="text-[11px] font-medium text-white/70 light:text-slate-600">{label}</span>
    </>
  );
  const className = "flex flex-col items-center gap-1.5 rounded-xl py-1 text-center transition-colors hover:bg-white/[0.03] light:hover:bg-slate-50";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  if (protectedRoute && href) {
    return (
      <ProtectedLink href={href} className={className}>
        {inner}
      </ProtectedLink>
    );
  }
  return (
    <Link href={href ?? "#"} className={className}>
      {inner}
    </Link>
  );
}

export default function QuickActionsGrid() {
  const { t } = useLanguage();

  return (
    <section className="min-[800px]:hidden">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-white/40 light:text-slate-500">{t("nav.quickActions")}</h2>
      <div className="glass-card grid grid-cols-4 gap-1 rounded-xl p-2">
        <ActionTile label={t("nav.search")} icon={<SearchIcon />} onClick={openMobileNavDrawer} />
        <ActionTile label={t("nav.decisionSupportLab")} icon={<DecisionLabIcon />} href="/decision-support-lab" />
        <ActionTile label={t("nav.economicCalendar")} icon={<CalendarIcon />} href="/economic-calendar" protectedRoute />
        <ActionTile label={t("nav.settings")} icon={<SettingsIcon />} href="/settings/preferences" protectedRoute />
      </div>
    </section>
  );
}
