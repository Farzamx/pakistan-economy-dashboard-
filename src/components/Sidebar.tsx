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

// `id` is the homepage section's element id. The rendered href is always
// "/#id" (absolute, never a bare "#id") — these are anchors on `/` only,
// and a bare "#id" resolves against whatever route is currently active. On
// /comparisons (or any future non-homepage route) that silently produces
// "/comparisons#id", which matches nothing and leaves the current page
// mounted instead of navigating away — the bug this fixes.
// Maps section id → translation key under nav.*
const NAV_ITEMS: { key: string; id: string }[] = [
  { key: "overview",        id: "overview" },
  { key: "riskIntel",       id: "risk-intelligence" },
  { key: "gdp",             id: "gdp" },
  { key: "inflation",       id: "inflation" },
  { key: "prices",          id: "price-indices" },
  { key: "monetaryPolicy",  id: "monetary-policy" },
  { key: "globalMarkets",   id: "global-markets" },
  { key: "realEconomy",     id: "real-economy" },
  { key: "reserves",        id: "reserves" },
  { key: "liveFX",          id: "live-fx" },
  { key: "exchangeRate",    id: "exchange-rate" },
  { key: "remittances",     id: "remittances" },
  { key: "externalSector",  id: "external-sector" },
  { key: "news",            id: "news-intelligence" },
];

// Sidebar Information Architecture grouping — purely a rendering split of
// NAV_ITEMS into labeled bands (Main / Analytics). NAV_ITEMS' own array
// order is untouched, so the scroll-spy's "last in document order wins"
// tie-break logic above stays correct; this only changes how the same
// items are bucketed under headers, not their underlying order or ids.
// "External Sector" and "News" aren't in the original IA spec's Analytics
// list but are real, working sections — folding them into Analytics
// (rather than dropping them) keeps that existing functionality intact.
const MAIN_NAV_ITEMS = NAV_ITEMS.slice(0, 2);
const ANALYTICS_NAV_ITEMS = NAV_ITEMS.slice(2);

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
  const isHomepage = pathname === "/";
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [psxOpen, setPsxOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(NAV_ITEMS[0].id);
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

  // Scroll-spy: highlights whichever section is currently in view. A thin
  // detection band near the top of the viewport (via rootMargin) decides
  // which section "counts" as current. When two adjacent sections both
  // straddle that band during a fast scroll, the one furthest down the
  // page (last in document order) wins — matching downward scroll intent.
  // Only meaningful on the homepage — these section ids don't exist on any
  // other route, so the effect is a no-op (and correctly inert) elsewhere.
  useEffect(() => {
    if (!isHomepage) return;

    const ids = NAV_ITEMS.map((item) => item.id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }
        for (let i = ids.length - 1; i >= 0; i--) {
          if (visible.has(ids[i])) {
            setActiveId(ids[i]);
            break;
          }
        }
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHomepage]);

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col gap-8 border-r border-white/5 light:border-slate-200 bg-white/[0.02] light:bg-white p-6 backdrop-blur-xl light:backdrop-blur-none sm:flex sticky top-0 h-screen overflow-y-auto hide-scrollbar light:shadow-[1px_0_0_0_#E2E6EF]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="glow-blue flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple text-lg font-bold text-white">
            P
          </div>
          <div>
            <p className="text-sm font-semibold text-white light:text-slate-900">{t("nav.logoName")}</p>
            <p className="text-xs text-white/40 light:text-slate-400">{t("nav.logoSubtitle")}</p>
          </div>
        </div>

        {/* Auth card — near the top per the Auth UX Enhancement, replacing
            the old plain-text Login/Logout row that used to live at the
            bottom of the nav below (kept there would have been a duplicate
            CTA in the same sidebar). */}
        <SidebarAuthCard />

        <GlobalSearch onLinkClick={handleProtectedNav} placeholder={t("search.placeholder")} />

        {/* Navigation — grouped per the Sidebar Information Architecture
            pass into Main / Analytics / Premium Tools bands. Premium Tools
            (including PSX) now renders FIRST, directly below the search
            bar — these are flagship/value-added features (Comparisons,
            Budget Tracker, Provincial Budget, Economic Calendar, PSX) and
            the Navigation UX Improvement pass moved them above the fold so
            they're visible without scrolling, rather than after the full
            Main/Analytics anchor list. This is purely a sidebar DOM
            position change — it doesn't touch NAV_ITEMS' own order, so the
            scroll-spy's "last in document order wins" tie-break and the
            `activeId` default ("overview") are unaffected.
            Economic Calendar joined this group (moved out of Analytics
            below) when it became a premium tool — same gating, same
            gradient/glow treatment as its three siblings here, just its
            own color (cyan) so all four stay visually distinct. */}
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

          <SidebarSectionLabel>{t("nav.main")}</SidebarSectionLabel>
          {MAIN_NAV_ITEMS.map((item) => (
            <SidebarNavLink
              key={item.key}
              href={`/#${item.id}`}
              isActive={isHomepage && activeId === item.id}
              label={t(`nav.${item.key}`)}
            />
          ))}

          <SidebarSectionLabel>{t("nav.analytics")}</SidebarSectionLabel>

          {ANALYTICS_NAV_ITEMS.map((item) => (
            <SidebarNavLink
              key={item.key}
              href={`/#${item.id}`}
              isActive={isHomepage && activeId === item.id}
              label={t(`nav.${item.key}`)}
            />
          ))}

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

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PsxComingSoonModal open={psxOpen} onClose={() => setPsxOpen(false)} />
      <GuestAccessModal open={guestModalOpen} onClose={() => setGuestModalOpen(false)} destination={guestDestination} />
    </>
  );
}
