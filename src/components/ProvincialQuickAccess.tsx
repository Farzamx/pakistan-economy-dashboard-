"use client";

// Provincial Quick Access (Provincial Quick Access pass) — one-click cards
// to each province's Budget Workshop, surfaced right on the homepage since
// Provincial Budget Intelligence is one of the platform's strongest
// features but previously required scrolling to the Sidebar's Premium
// Tools group to discover.
//
// Each card's href (/provincial-budget and /provincial-budget/{province})
// is a premium tool per protectedSections.ts's PROTECTED_EXACT_PATHS — the
// SEO Architecture Migration briefly made these public, but the Premium
// Access Restoration fix put them back behind the login wall. handleClick's
// isProtectedPath check below is what makes that correctly show
// GuestAccessModal here instead of silently letting the click through.

import Link from "next/link";
import { useState } from "react";
import { PROVINCES } from "@/lib/provincial/provincialBudgetRegistry";
import { useAuth } from "@/components/AuthProvider";
import { usePreferences } from "@/components/PreferencesProvider";
import { isProtectedPath } from "@/lib/protectedSections";
import GuestAccessModal from "@/components/GuestAccessModal";

export default function ProvincialQuickAccess() {
  const { user, loading } = useAuth();
  const { preferences } = usePreferences();
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestDestination, setGuestDestination] = useState("/provincial-budget");

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!isProtectedPath(href)) return;
    if (loading || user) return;
    e.preventDefault();
    setGuestDestination(href);
    setGuestModalOpen(true);
  }

  return (
    <section className="mt-8" data-cta-source="provincial-quick-access">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/40 light:text-slate-500">
          Provincial Budget Intelligence
        </h2>
        <Link
          href="/provincial-budget"
          onClick={(e) => handleClick(e, "/provincial-budget")}
          className="text-xs font-medium text-neon-blue/80 transition-colors hover:text-neon-blue"
        >
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PROVINCES.map((p) => {
          const href = `/provincial-budget/${p.slug}`;
          const isDefault = preferences?.preferredProvince === p.id;
          return (
            <Link
              key={p.id}
              href={href}
              onClick={(e) => handleClick(e, href)}
              data-cta="provincial-quick-access"
              data-cta-source="provincial-quick-access"
              className="glass-card group relative flex flex-col gap-1.5 rounded-xl p-4 transition-all hover:scale-[1.02]"
              style={{ borderColor: isDefault ? p.color : `${p.color}33` }}
            >
              {isDefault && (
                <span
                  className="absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                  style={{ backgroundColor: p.color }}
                >
                  Default
                </span>
              )}
              <span
                className="h-1.5 w-6 rounded-full transition-all group-hover:w-9"
                style={{ backgroundColor: p.color }}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-white light:text-slate-900">{p.name}</span>
              <span className="text-xs text-white/40 light:text-slate-400">{p.capital}</span>
            </Link>
          );
        })}
      </div>

      <GuestAccessModal open={guestModalOpen} onClose={() => setGuestModalOpen(false)} destination={guestDestination} />
    </section>
  );
}
