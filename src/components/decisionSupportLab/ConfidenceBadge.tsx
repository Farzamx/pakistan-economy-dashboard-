"use client";

// Section A3: the confidence bar's warning chips are actionable, not
// static text. "Incomplete/Partial profile" opens the profile drawer
// scrolled to the tool's first missing field (via toolFieldRegistry.ts,
// the same registry MissingFieldPrompt reads — never a second hand-kept
// list). "N manual estimate(s)"/"No historical coverage" open a small
// popover explaining what that means and what was substituted, since no
// per-tool provenance detail is wired in yet (see provenance.ts — a
// future refinement, not fabricated here).
import { useState } from "react";
import type { ConfidenceResult } from "@/lib/decisionSupportLab/confidenceEngine";
import { useEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import { getMissingFields } from "@/lib/decisionSupportLab/toolFieldRegistry";
import { PROFILE_FIELD_DOM_IDS } from "@/lib/decisionSupportLab/profileFieldDomIds";
import { openProfileDrawer } from "@/lib/decisionSupportLab/profileDrawerStore";

interface Props {
  result: ConfidenceResult;
  /** Registry key from toolFieldRegistry.ts — enables the "Incomplete profile" chip to open the drawer scrolled to this tool's actual first missing field instead of just opening it blind. */
  toolId?: string;
}

const LABEL_COLOR: Record<ConfidenceResult["label"], string> = {
  High: "text-emerald-400",
  Moderate: "text-amber-400",
  Low: "text-rose-400",
};

function isProfileFactor(label: string): boolean {
  return label === "Incomplete profile" || label === "Partial profile";
}
function isEstimateFactor(label: string): boolean {
  return /manual estimate/.test(label);
}
function isCoverageFactor(label: string): boolean {
  return label === "No historical coverage";
}

export default function ConfidenceBadge({ result, toolId }: Props) {
  const { profile } = useEconomicProfile();
  const [openPopover, setOpenPopover] = useState<number | null>(null);

  function handleProfileClick() {
    const missing = toolId ? getMissingFields(toolId, profile) : [];
    const domId = missing[0] ? PROFILE_FIELD_DOM_IDS[missing[0]] : undefined;
    openProfileDrawer(domId);
  }

  return (
    <div className="glass-card flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl p-3 text-xs sm:p-4" aria-live="polite">
      <span className={`text-mono-num text-sm font-semibold tabular-nums ${LABEL_COLOR[result.label]}`}>{result.score}%</span>
      <span className="text-white/40 light:text-slate-400">Confidence</span>
      {result.factors.map((factor, i) => {
        if (factor.positive) {
          return (
            <span key={`${factor.label}-${i}`} className="flex items-center gap-1 text-white/50 light:text-slate-500">
              <span aria-hidden="true">·</span>
              <span>{factor.label}</span>
            </span>
          );
        }

        if (isProfileFactor(factor.label)) {
          return (
            <span key={`${factor.label}-${i}`} className="flex items-center gap-1">
              <span aria-hidden="true" className="text-white/50 light:text-slate-500">
                ·
              </span>
              <button
                type="button"
                onClick={handleProfileClick}
                className="rounded text-amber-300/80 underline decoration-dotted underline-offset-2 transition-colors hover:text-amber-200 light:text-amber-700 light:hover:text-amber-800"
              >
                {factor.label}
              </button>
            </span>
          );
        }

        if (isEstimateFactor(factor.label) || isCoverageFactor(factor.label)) {
          const isOpen = openPopover === i;
          return (
            <span key={`${factor.label}-${i}`} className="relative flex items-center gap-1">
              <span aria-hidden="true" className="text-white/50 light:text-slate-500">
                ·
              </span>
              <button
                type="button"
                onClick={() => setOpenPopover(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="rounded text-amber-300/80 underline decoration-dotted underline-offset-2 transition-colors hover:text-amber-200 light:text-amber-700 light:hover:text-amber-800"
              >
                {factor.label}
              </button>
              {isOpen && (
                <div
                  role="tooltip"
                  className="glass-card absolute bottom-full left-0 z-10 mb-2 w-64 rounded-lg border border-[var(--border-subtle)] p-3 text-left text-xs font-normal normal-case leading-relaxed text-white/70 shadow-xl light:text-slate-600"
                >
                  {isEstimateFactor(factor.label)
                    ? "This result includes one or more figures you entered manually instead of verified official data — usually because no official source covers that specific input. Check the values you typed above; they drive this outcome directly."
                    : "The historical average for your exact time range isn't available in our dataset, so the latest official inflation rate was substituted for the missing years instead."}
                  <button type="button" onClick={() => setOpenPopover(null)} className="mt-2 block text-[11px] font-semibold text-neon-blue">
                    Got it
                  </button>
                </div>
              )}
            </span>
          );
        }

        return (
          <span key={`${factor.label}-${i}`} className="flex items-center gap-1 text-amber-300/80">
            <span aria-hidden="true" className="text-white/50 light:text-slate-500">
              ·
            </span>
            <span>{factor.label}</span>
          </span>
        );
      })}
    </div>
  );
}
