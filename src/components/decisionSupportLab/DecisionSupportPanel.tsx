import Link from "next/link";
import { T } from "@/components/T";
import SaveToSnapshotButton from "@/components/decisionSupportLab/SaveToSnapshotButton";
import type { CalculationSnapshotPayload } from "@/lib/supabase/calculationSnapshots";

export interface RelatedTool {
  title: string;
  href: string;
}

export interface SuggestedNext {
  title: string;
  href: string;
  reason: string;
}

export interface DecisionSupportPanelProps {
  whatHappened: string;
  whyItHappened: string;
  whatToUnderstand: string;
  relatedTools: RelatedTool[];
  suggestedNext?: SuggestedNext;
  /** Optional — when provided, a "Save this result to my snapshot" button renders alongside Related Tools (Section D3). Opt-in per tool, same convention as ReportDownloadButton's snapshotPayload. */
  snapshotPayload?: () => CalculationSnapshotPayload;
}

/**
 * The Lab's shared "what does this mean for you, and what next" panel —
 * appears below every tool's result. This is the concrete mechanism behind
 * the Lab's guided workflow (Budget → Personal Inflation → Purchasing
 * Power → ...): rather than a separate wizard shell, each tool's
 * suggestedNext link IS the "next step," so users move through the Lab as
 * a sequence of small, clear invitations instead of picking blindly from
 * the landing page's tool grid every time.
 */
export default function DecisionSupportPanel({ whatHappened, whyItHappened, whatToUnderstand, relatedTools, suggestedNext, snapshotPayload }: DecisionSupportPanelProps) {
  return (
    <section className="glass-card flex flex-col gap-5 rounded-xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white light:text-slate-900">
        <T tKey="decisionSupportLab.decisionPanelTitle" />
      </h2>

      <div>
        <p className="text-sm font-semibold text-white/85 light:text-slate-800">
          <T tKey="decisionSupportLab.whatHappenedQuestion" />
        </p>
        <p className="mt-1 text-sm leading-relaxed text-white/60 light:text-slate-500">{whatHappened}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-white/85 light:text-slate-800">
          <T tKey="decisionSupportLab.whyHappenedQuestion" />
        </p>
        <p className="mt-1 text-sm leading-relaxed text-white/60 light:text-slate-500">{whyItHappened}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-white/85 light:text-slate-800">
          <T tKey="decisionSupportLab.whatToUnderstandQuestion" />
        </p>
        <p className="mt-1 text-sm leading-relaxed text-white/60 light:text-slate-500">{whatToUnderstand}</p>
      </div>

      {relatedTools.length > 0 && (
        <div className="section-divider pt-4">
          <p className="text-label text-white/40 light:text-slate-400">
            <T tKey="decisionSupportLab.relatedToolsLabel" />
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {relatedTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-neon-blue hover:text-white light:text-slate-600"
              >
                {tool.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {snapshotPayload && <SaveToSnapshotButton snapshotPayload={snapshotPayload} />}

      {suggestedNext && (
        <Link
          href={suggestedNext.href}
          className="flex items-center justify-between gap-4 rounded-xl border border-neon-blue/30 bg-neon-blue/10 p-4 transition-colors hover:border-neon-blue/50"
        >
          <div>
            <p className="text-label text-neon-blue">
              <T tKey="decisionSupportLab.suggestedNextLabel" />
            </p>
            <p className="mt-1 text-sm font-semibold text-white light:text-slate-900">{suggestedNext.title}</p>
            <p className="mt-0.5 text-xs text-white/50 light:text-slate-500">{suggestedNext.reason}</p>
          </div>
          <span aria-hidden="true" className="shrink-0 text-neon-blue">
            →
          </span>
        </Link>
      )}
    </section>
  );
}
