"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import SettingsModal from "@/components/SettingsModal";
import PsxComingSoonModal from "@/components/PsxComingSoonModal";
import GuestAccessModal from "@/components/GuestAccessModal";
import SidebarAuthCard from "@/components/SidebarAuthCard";
import GlobalSearch from "@/components/GlobalSearch";
import { useAuth } from "@/components/AuthProvider";
import { isProtectedPath } from "@/lib/protectedSections";
import { useLanguage } from "@/components/LanguageProvider";
import { useSidebar } from "@/components/SidebarProvider";

function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 mb-1.5 px-4 text-label text-white/30 light:text-slate-400 first:mt-0">
      {children}
    </p>
  );
}

// PEIC v2: every "Premium Tools" row used to get its own hardcoded accent
// color (purple/blue/emerald/cyan/rose/amber) purely for visual variety —
// exactly the "cards compete for attention" pattern the v2 redesign exists
// to remove. One shared row style now, for every nav item alike: neutral
// at rest, a single blue accent when active. Color means "this is where
// you are," not "this row's turn in the rainbow."
function SidebarNavLink({
  href,
  icon,
  label,
  isActive,
  onClick,
  ariaLabel,
}: {
  href: string;
  icon?: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  ariaLabel?: string;
}) {
  return (
    <motion.div whileHover={{ x: 3 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="mb-0.5">
      <Link
        href={href}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-current={isActive ? "true" : undefined}
        className={`group flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
          isActive
            ? "border-neon-blue/25 bg-neon-blue/10 text-white light:text-slate-900"
            : "border-transparent text-white/60 light:text-slate-600 hover:border-white/[0.06] hover:bg-white/5 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
        }`}
      >
        {icon && (
          <span className={isActive ? "text-neon-blue" : "text-white/40 light:text-slate-400 group-hover:text-white/70 light:group-hover:text-slate-600"}>
            {icon}
          </span>
        )}
        <span>{label}</span>
      </Link>
    </motion.div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const { collapsed, toggle } = useSidebar();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [psxOpen, setPsxOpen] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestDestination, setGuestDestination] = useState("/");
  const [hash, setHash] = useState("");

  // Tracks the URL hash so the Free Subscription item can show as active
  // when the user navigates to /economic-calendar#email-alerts, and return
  // to inactive (while Economic Calendar stays active) when they scroll
  // elsewhere on the page.
  useEffect(() => {
    function onHashChange() { setHash(window.location.hash); }
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Intercepts a click on a protected section's Link while signed out:
  // prevents the navigation and opens the GuestAccessModal instead, so a
  // guest never sees a flash of the page before proxy.ts would otherwise
  // redirect them. Signed-in users (and while the initial session check is
  // still loading) navigate normally — showing the modal during `loading`
  // would misfire for users who are actually signed in but whose session
  // hasn't resolved on this render yet.
  // When the user clicks "Free Subscription" while already on the calendar
  // page, smooth-scroll to the section instead of doing a hard navigation
  // (which would jump instantly). On any other page, let the Link navigate
  // normally — the browser will anchor-scroll on arrival.
  function handleSubscriptionClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/economic-calendar") return;
    e.preventDefault();
    const el = document.getElementById("email-alerts");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", "/economic-calendar#email-alerts");
      setHash("#email-alerts");
    }
  }

  function handleProtectedNav(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!isProtectedPath(href)) return;
    if (loading || user) return;
    e.preventDefault();
    setGuestDestination(href);
    setGuestModalOpen(true);
  }

  return (
    <>
      {/* Outer wrapper carries the sticky/viewport-height positioning (not
          <aside> itself), so the collapse handle — absolutely positioned at
          50% of THIS element — tracks the visible viewport at any scroll
          position, and is never clipped by <aside>'s own overflow-y-auto
          (which per the CSS overflow spec forces overflow-x to "auto" too,
          the moment overflow-y isn't "visible"). */}
      <div className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 sm:block">
        <aside
          className={`relative flex h-full flex-col overflow-y-auto overflow-x-hidden border-r border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white backdrop-blur-xl light:backdrop-blur-none hide-scrollbar light:shadow-[1px_0_0_0_#E2E6EF] transition-[width] duration-200 ease-out ${
            collapsed ? "w-0 gap-0 p-0 opacity-0 pointer-events-none" : "w-64 gap-6 p-5 opacity-100"
          }`}
          aria-hidden={collapsed}
        >
        {/* Auth card — near the top per the Auth UX Enhancement, replacing
            the old plain-text Login/Logout row that used to live at the
            bottom of the nav below (kept there would have been a duplicate
            CTA in the same sidebar). */}
        <SidebarAuthCard />

        <GlobalSearch onLinkClick={handleProtectedNav} placeholder={t("search.placeholder")} />

        {/* Secondary/tool navigation only (PEIC v3 nav restructure) — the
            primary site-level nav (Overview, Markets, Calendar, Research,
            Academy, Risk Intel) now lives in TopNav.tsx as a horizontal bar.
            This sidebar keeps Premium Tools + Settings, matching an
            institutional research site's "tools" rail rather than a full
            page-section index. */}
        <nav className="flex flex-col gap-1">
          <SidebarSectionLabel>{t("nav.premiumTools")}</SidebarSectionLabel>

          <SidebarNavLink
            href="/comparisons"
            onClick={(e) => handleProtectedNav(e, "/comparisons")}
            isActive={!!pathname?.startsWith("/comparisons")}
            label={t("nav.comparisons")}
            icon={
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 16l4.5-7L12 13l4-6L21 8" />
                <path d="M19 4l2 2-2 2M5 16l-2 2 2 2" />
              </svg>
            }
          />

          <SidebarNavLink
            href="/budget"
            onClick={(e) => handleProtectedNav(e, "/budget")}
            isActive={!!pathname?.startsWith("/budget")}
            label={t("nav.budgetTracker")}
            icon={
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="10" width="4" height="10" />
                <rect x="10" y="6" width="4" height="14" />
                <rect x="17" y="13" width="4" height="7" />
              </svg>
            }
          />

          <SidebarNavLink
            href="/provincial-budget"
            onClick={(e) => handleProtectedNav(e, "/provincial-budget")}
            isActive={!!pathname?.startsWith("/provincial-budget")}
            label={t("nav.provincialBudget")}
            icon={
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 14l3-3 3 2 4-5" />
              </svg>
            }
          />

          {/* Active only when on the calendar page but NOT viewing the
              subscription section — when the user clicks "Free Subscription"
              the calendar item yields and the subscription item lights up. */}
          <SidebarNavLink
            href="/economic-calendar"
            onClick={(e) => handleProtectedNav(e, "/economic-calendar")}
            isActive={!!pathname?.startsWith("/economic-calendar") && hash !== "#email-alerts"}
            label={t("nav.economicCalendar")}
            icon={
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
            }
          />

          {/* Links to the email alert sign-up section on the Economic
              Calendar page. Smooth-scrolls when already on that page;
              navigates normally otherwise. Active only when hash is
              #email-alerts so it never conflicts with the Calendar item. */}
          <SidebarNavLink
            href="/economic-calendar#email-alerts"
            onClick={handleSubscriptionClick}
            ariaLabel="Free email subscription — get alerts for Pakistan economic releases"
            isActive={pathname === "/economic-calendar" && hash === "#email-alerts"}
            label={t("nav.freeSubscription")}
            icon={
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 8l10 6 10-6" />
              </svg>
            }
          />

          <SidebarNavLink
            href="/academy"
            isActive={!!pathname?.startsWith("/academy")}
            label={t("nav.academy")}
            icon={
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            }
          />

          {/* PSX — opens "Coming Soon" modal, not a nav link */}
          <motion.button
            type="button"
            onClick={() => setPsxOpen(true)}
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex w-full items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-white/50 light:text-slate-500 transition-colors hover:bg-white/5 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
          >
            <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l5-5 4 4 6-7" />
              <path d="M14 9h5v5" />
            </svg>
            {t("nav.psxLabel")}
          </motion.button>

          {/* Settings — opens modal, not a nav link */}
          <motion.button
            type="button"
            onClick={() => setSettingsOpen(true)}
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex w-full items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-white/50 light:text-slate-500 transition-colors hover:bg-white/5 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
          >
            <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="2.5" />
              <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" strokeLinecap="round" />
            </svg>
            {t("nav.settings")}
          </motion.button>
        </nav>

        {/* Footer note */}
        <div className="mt-auto rounded-xl border border-white/5 light:border-slate-200 bg-white/[0.03] light:bg-slate-50 p-4 text-xs text-white/40 light:text-slate-400">
          {t("nav.liveData")}
        </div>
        </aside>

        {/* Collapse handle — vertically centered on the sidebar's edge.
            Only this remains visible while collapsed; <main> (already
            flex-1) reflows into the reclaimed width automatically since
            <aside> above shrinks to w-0, no per-page layout change needed. */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-1/2 -right-3 z-10 flex h-7 w-6 -translate-y-1/2 items-center justify-center rounded-md border border-white/10 light:border-slate-200 bg-[var(--surface-3)] text-white/50 light:text-slate-500 shadow-sm transition-colors hover:text-white light:hover:text-slate-900"
        >
          <svg className={`h-3 w-3 transition-transform ${collapsed ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PsxComingSoonModal open={psxOpen} onClose={() => setPsxOpen(false)} />
      <GuestAccessModal open={guestModalOpen} onClose={() => setGuestModalOpen(false)} destination={guestDestination} />
    </>
  );
}
