"use client";

import { useState } from "react";
import { generateReportPdf, type ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";

interface Props {
  /** Built lazily on click, not on every render — the definition can involve string formatting that's cheap but pointless to redo every keystroke elsewhere on the page. */
  buildDefinition: () => ReportDefinition;
  filename: string;
  label: string;
  generatingLabel: string;
}

/**
 * The Lab's shared "Download Full Report" trigger — any tool hands it a
 * buildDefinition() callback and a filename; this component owns the
 * generating/idle state and the reportFramework.ts call, so a future tool
 * only ever needs to describe ITS report content, never re-implement the
 * button or the jsPDF wiring.
 */
export default function ReportDownloadButton({ buildDefinition, filename, label, generatingLabel }: Props) {
  const [generating, setGenerating] = useState(false);

  async function handleClick() {
    setGenerating(true);
    try {
      await generateReportPdf(buildDefinition(), filename);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={generating}
      className="self-start rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue disabled:opacity-50 light:text-slate-700"
    >
      {generating ? generatingLabel : label}
    </button>
  );
}
