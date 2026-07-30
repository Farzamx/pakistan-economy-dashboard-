"use client";

import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import type { PersonalInflationResult } from "@/lib/personalInflation/engine";
import { SITE_URL } from "@/lib/seoConfig";

interface Props {
  result: PersonalInflationResult;
  observationDate: string;
}

const PAGE_URL = `${SITE_URL}/decision-support-lab/personal-inflation`;

/**
 * Thin tool-specific wrapper around the Lab's shared ToolShareCard
 * (Phase 2) — this file used to own the canvas drawing and share-button
 * wiring directly; that's now generic and shared with Purchasing Power /
 * Budget Allocation, so this component only describes WHAT to show.
 */
export default function ShareCard({ result, observationDate }: Props) {
  const diffSign = result.differencePct > 0 ? "+" : "";
  const tone = result.differencePct > 0.3 ? "up" : result.differencePct < -0.3 ? "down" : "neutral";

  return (
    <ToolShareCard
      title="My Personal Inflation Rate"
      headlineValue={`${result.personalCpiPct.toFixed(1)}%`}
      headlineTone={tone}
      comparisonLine={`vs. Official CPI ${result.officialCpiPct.toFixed(1)}%`}
      deltaLine={`${diffSign}${result.differencePct.toFixed(1)} percentage points`}
      bars={[
        { label: "Official CPI", value: result.officialCpiPct, color: "#4d8df7" },
        { label: "Your Personal CPI", value: result.personalCpiPct, color: tone === "up" ? "#fb7185" : tone === "down" ? "#34d399" : "#9b8afb" },
      ]}
      badgeLines={["Pakistan Bureau of Statistics", `Data as of ${observationDate}`]}
      shareUrl={PAGE_URL}
      shareSummary={`My personal inflation rate is ${result.personalCpiPct.toFixed(1)}% vs the official CPI of ${result.officialCpiPct.toFixed(1)}% (${diffSign}${result.differencePct.toFixed(1)}pp).`}
      filenameBase="my-personal-inflation-rate"
    />
  );
}
