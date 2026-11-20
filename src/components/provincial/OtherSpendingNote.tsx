"use client";

import InfoTooltip from "@/components/InfoTooltip";
import { LeadMore } from "@/components/shell/Disclosure";

const DEFAULT_NOTE =
  "\"Other\" combines items this province's own budget document does not itemize: administration, unitemized pensions, grants, public services, debt obligations and miscellaneous spending.";

interface OtherSpendingNoteProps {
  /** The source document's own description of what remains in "Other" for this specific year, when one was found during the audit — falls back to a generic explanation otherwise. */
  residualNote?: string;
}

/** Phase 3 of the "Other" breakdown audit — appears below both the allocation chart and the Rs100 card so the residual slice never looks unexplained. */
export default function OtherSpendingNote({ residualNote }: OtherSpendingNoteProps) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
      <InfoTooltip termKey="other-spending" size="xs" />
      <LeadMore className="min-w-0" leadClassName="text-xs leading-relaxed text-[var(--text-muted)]">
        {residualNote ?? DEFAULT_NOTE}
      </LeadMore>
    </div>
  );
}
