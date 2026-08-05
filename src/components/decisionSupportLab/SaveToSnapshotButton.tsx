"use client";

// Section D3 — a standalone "Save this result to my snapshot" action,
// independent of ReportDownloadButton's PDF-generation flow (a user
// shouldn't have to download a PDF just to add a result to their
// snapshot). Same calculation_snapshots table/CRUD calculationSnapshots.ts
// already provides — this is a second, dedicated entry point into it.
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import { saveCalculationSnapshot, type CalculationSnapshotPayload } from "@/lib/supabase/calculationSnapshots";

interface Props {
  snapshotPayload: () => CalculationSnapshotPayload;
}

export default function SaveToSnapshotButton({ snapshotPayload }: Props) {
  const { user } = useAuth();
  const { profile } = useEconomicProfile();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (!user) return null;

  async function handleClick() {
    setStatus("saving");
    try {
      await saveCalculationSnapshot(user!.id, snapshotPayload(), profile.schemaVersion);
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 3000);
    }
  }

  const label = status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : status === "error" ? "Couldn't save — try again" : "Save this result to my snapshot";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "saving"}
      className="self-start rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue disabled:opacity-50 light:text-slate-700"
    >
      {label}
    </button>
  );
}
