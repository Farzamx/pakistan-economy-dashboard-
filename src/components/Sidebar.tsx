"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SettingsModal from "@/components/SettingsModal";
import PsxComingSoonModal from "@/components/PsxComingSoonModal";
import GuestAccessModal from "@/components/GuestAccessModal";
import SidebarAuthCard from "@/components/SidebarAuthCard";
import GlobalSearch from "@/components/GlobalSearch";
import { useAuth } from "@/components/AuthProvider";
import { isProtectedPath } from "@/lib/protectedSections";
import { useLanguage } from "@/components/LanguageProvider";
import { useSidebar } from "@/components/SidebarProvider";
import { SIDEBAR_NAV_GROUPS, SIDEBAR_ANCHOR_ORDER, type SidebarNavTarget } from "@/lib/sidebarNav";

function targetHref(target: SidebarNavTarget): string {
  return target.kind === "anchor" ? `/#${target.id}` : target.href;
}

function GroupChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 text-white/30 light:text-slate-400 transition-transform ${expanded ? "" : "-rotate-90"}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

// Plain bulleted row — the entire content-navigation tree (PEIC v3 nav
// restructure) uses this one uniform style rather than a per-item icon set,
// matching a Bloomberg-terminal-style text menu instead of a SaaS sidebar.
function SidebarTreeRow({
  href,
  label,
  isActive,
  onClick,
  ariaLabel,
  flagship,
}: {
  href: string;
  label: string;
  isActive: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  ariaLabel?: string;
  /** Phase 6 — see SidebarNavItem.flagship. A narrow exception to this row's otherwise-uniform bullet dot, not a restructure of the tree. */
  flagship?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={isActive ? "true" : undefined}
      className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-[13px] transition-colors duration-[var(--motion-micro)] ${
        isActive
          ? "text-neon-blue"
          : "text-white/55 light:text-slate-500 hover:bg-white/[0.04] hover:text-white light:hover:bg-slate-50 light:hover:text-slate-900"
      }`}
    >
      <span
        className={`h-1 w-1 shrink-0 rounded-full ${
          isActive ? "bg-neon-blue" : flagship ? "bg-gradient-to-r from-neon-blue to-violet-400" : "bg-white/20 light:bg-slate-300"
        }`}
      />
      {label}
    </Link>
  );
}

function SidebarTreeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-4 py-1.5 text-left text-[13px] text-white/55 light:text-slate-500 transition-colors duration-[var(--motion-micro)] hover:bg-white/[0.04] hover:text-white light:hover:bg-slate-50 light:hover:text-slate-900"
    >
      <span className="h-1 w-1 shrink-0 rounded-full bg-white/20 light:bg-slate-300" />
      {label}
    </button>
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
  const [activeAnchorId, setActiveAnchorId] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

  // Content-navigation scroll-spy (PEIC v3 nav restructure) — replaces the
  // old horizontal SectionNav ribbon's IntersectionObserver, now driving the
  // sidebar's tree instead. Only meaningful on the homepage, where every one
  // of these anchor ids actually exists in the DOM.
  useEffect(() => {
    if (pathname !== "/") return;
    const sections = SIDEBAR_ANCHOR_ORDER
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        for (let i = SIDEBAR_ANCHOR_ORDER.length - 1; i >= 0; i--) {
          if (visible.has(SIDEBAR_ANCHOR_ORDER[i])) {
            setActiveAnchorId(SIDEBAR_ANCHOR_ORDER[i]);
            break;
          }
        }
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  // Clicking a homepage-anchor item while already on "/" smooth-scrolls
  // instead of doing a full navigation; from any other page, the Link below
  // navigates normally to "/#id" and the browser anchor-scrolls on arrival
  // (same convention already used for Free Subscription's
  // /economic-calendar#email-alerts link).
  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    if (pathname !== "/") return;
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, "", `/#${id}`);
    setActiveAnchorId(id);
  }

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

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      {/* Outer wrapper carries the sticky/viewport-height positioning (not
          <aside> itself), so the collapse handle — absolutely positioned at
          50% of THIS element — tracks the visible viewport at any scroll
          position, and is never clipped by <aside>'s own overflow-y-auto
          (which per the CSS overflow spec forces overflow-x to "auto" too,
          the moment overflow-y isn't "visible"). */}
      {/* min-[800px], matching TopNav/MobileNav's threshold (see TopNav.tsx)
          — must switch at the exact same width those do, or this desktop
          sidebar and the mobile hamburger nav would both be visible (or
          both hidden) in between. */}
      <div className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 min-[800px]:block">
        <aside
          className={`relative flex h-full flex-col overflow-y-auto overflow-x-hidden border-r border-white/5 light:border-slate-200 bg-[#070812] light:bg-white hide-scrollbar light:shadow-[1px_0_0_0_#E2E6EF] transition-[width] duration-200 ease-out ${
            collapsed ? "w-0 gap-0 p-0 opacity-0 pointer-events-none" : "w-64 gap-5 p-5 opacity-100"
          }`}
          aria-hidden={collapsed}
        >
        {/* Auth card — near the top per the Auth UX Enhancement, replacing
            the old plain-text Login/Logout row that used to live at the
            bottom of the nav below (kept there would have been a duplicate
            CTA in the same sidebar). */}
        <SidebarAuthCard />

        <GlobalSearch onLinkClick={handleProtectedNav} placeholder={t("search.placeholder")} />

        {/* Content-navigation tree (PEIC v3 nav-hierarchy restructure) — the
            full page/section index that used to live in the horizontal
            SectionNav ribbon beneath the Market Ribbon. TopNav.tsx keeps
            only global site-level destinations; every homepage section and
            every standalone indicator page is grouped here instead. */}
        <nav className="flex flex-col gap-1" aria-label="Content navigation">
          {SIDEBAR_NAV_GROUPS.map((group) => {
            const expanded = !collapsedGroups.has(group.key);
            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={expanded}
                  className="mt-3 mb-1 flex w-full items-center justify-between px-4 py-1 text-label text-white/30 light:text-slate-400 first:mt-0"
                >
                  <span>{t(group.labelKey)}</span>
                  <GroupChevron expanded={expanded} />
                </button>

                {expanded && (
                  <div className="flex flex-col gap-0.5 pb-1">
                    {group.items.map((item) => {
                      const target = item.target;
                      const isDataSources = item.labelKey === "modal.dsTitle";
                      const label = item.labelKey === "__kse100Proxy" ? "KSE-100 Proxy" : t(item.labelKey);
                      const href = targetHref(target);
                      const isActive =
                        !isDataSources && target.kind === "anchor"
                          ? pathname === "/" && activeAnchorId === target.id
                          : target.kind === "route"
                            ? !!pathname?.startsWith(target.href)
                            : false;
                      return (
                        <SidebarTreeRow
                          key={group.key + label}
                          href={href}
                          label={label}
                          isActive={isActive}
                          flagship={item.flagship}
                          onClick={
                            target.kind === "anchor"
                              ? (e) => handleAnchorClick(e, target.id)
                              : (e) => handleProtectedNav(e, href)
                          }
                        />
                      );
                    })}

                    {/* Free Subscription / Settings / PSX — kept as the
                        TOOLS group's remaining existing functionality,
                        special-cased rather than data-driven since their
                        active-state and click behavior (hash tracking, modal
                        triggers) don't fit the plain anchor/route shape above. */}
                    {group.key === "tools" && (
                      <>
                        <SidebarTreeRow
                          href="/economic-calendar#email-alerts"
                          onClick={handleSubscriptionClick}
                          ariaLabel="Free email subscription — get alerts for Pakistan economic releases"
                          isActive={pathname === "/economic-calendar" && hash === "#email-alerts"}
                          label={t("nav.freeSubscription")}
                        />
                        <SidebarTreeButton label={t("nav.psxLabel")} onClick={() => setPsxOpen(true)} />
                        <SidebarTreeButton label={t("nav.settings")} onClick={() => setSettingsOpen(true)} />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
