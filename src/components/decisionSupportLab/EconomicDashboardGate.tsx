"use client";

// Decides Onboarding vs. Decision Center — this has to be a client
// component since it depends on the reactive profile store's
// profileCompletedAt, not something the Server Component page can resolve.
// Once complete, the Dashboard is primary but the profile stays reachable
// (collapsed) for edits — never removed, just no longer the first thing shown.
import { useEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import EconomicProfileOnboarding from "@/components/decisionSupportLab/EconomicProfileOnboarding";
import EconomicDashboard from "@/components/decisionSupportLab/EconomicDashboard";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import type { LiveAssetData } from "@/lib/decisionSupportLab/liveAssetData";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
  liveData: LiveAssetData | null;
}

export default function EconomicDashboardGate({ breakdown, liveData }: Props) {
  const { profile } = useEconomicProfile();

  if (!profile.profileCompletedAt) {
    return <EconomicProfileOnboarding />;
  }

  return (
    <div className="flex flex-col gap-5">
      <EconomicDashboard breakdown={breakdown} liveData={liveData} />
      <details className="group rounded-lg border border-[var(--border-subtle)] p-3 sm:p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span className="text-sm font-semibold text-white light:text-slate-900">Edit your Economic Profile</span>
          <span aria-hidden="true" className="text-white/40 transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="mt-4">
          <EconomicProfileOnboarding />
        </div>
      </details>
    </div>
  );
}
