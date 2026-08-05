"use client";

// "We need one more value" — Phase 5.5 brief Part 3. Which fields are
// missing comes from the Tool Field Registry (toolFieldRegistry.ts), not a
// hardcoded per-tool check; how to render each field (label, placeholder,
// unit) is supplied by the caller, since input shape genuinely varies by
// field and a name-only registry can't know that. Renders nothing once 0
// relevant fields are missing (the tool proceeds straight to results) or
// once more than 2 are missing (the plan's own "≤2 compact prompt, ≥3 full
// form" threshold — the caller falls back to its normal form in that case).
import { useState } from "react";
import { getMissingFields } from "@/lib/decisionSupportLab/toolFieldRegistry";
import type { EconomicProfile } from "@/lib/decisionSupportLab/economicProfile";

export interface MissingFieldDescriptor {
  field: keyof EconomicProfile;
  label: string;
  placeholder: string;
  prefix?: string;
  suffix?: string;
  step?: number;
}

interface Props {
  toolId: string;
  profile: EconomicProfile;
  fieldDescriptors: MissingFieldDescriptor[];
  onSave: (patch: Partial<EconomicProfile>) => void;
}

export default function MissingFieldPrompt({ toolId, profile, fieldDescriptors, onSave }: Props) {
  const missing = getMissingFields(toolId, profile);
  const relevant = fieldDescriptors.filter((d) => missing.includes(d.field));
  const [values, setValues] = useState<Record<string, number>>({});

  if (relevant.length === 0 || relevant.length > 2) return null;

  function handleSave() {
    const patch: Partial<EconomicProfile> = {};
    for (const d of relevant) {
      const value = values[d.field as string];
      if (value !== undefined) (patch as Record<string, unknown>)[d.field as string] = value;
    }
    onSave(patch);
  }

  const allFilled = relevant.every((d) => (values[d.field as string] ?? 0) > 0);

  return (
    <div className="glass-card rounded-xl border border-neon-blue/20 p-4 sm:p-5">
      <p className="text-sm font-semibold text-white light:text-slate-900">{relevant.length === 1 ? "We need one more value." : "We need a couple more values."}</p>
      <p className="mt-1 text-xs text-white/50 light:text-slate-500">This saves to your Economic Profile, so you won&apos;t be asked again.</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {relevant.map((d) => (
          <div key={d.field as string}>
            <label htmlFor={`mfp-${d.field as string}`} className="text-label text-white/40 light:text-slate-400">
              {d.label}
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
              {d.prefix && <span className="text-sm text-white/40 light:text-slate-400">{d.prefix}</span>}
              <input
                id={`mfp-${d.field as string}`}
                type="number"
                inputMode="decimal"
                step={d.step ?? 1}
                placeholder={d.placeholder}
                value={values[d.field as string] === undefined || values[d.field as string] === 0 ? "" : values[d.field as string]}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  setValues((prev) => ({ ...prev, [d.field as string]: isNaN(parsed) ? 0 : parsed }));
                }}
                className="text-mono-num w-full bg-transparent text-sm font-semibold tabular-nums text-white outline-none light:text-slate-900"
              />
              {d.suffix && <span className="text-sm text-white/40 light:text-slate-400">{d.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!allFilled}
        onClick={handleSave}
        className="mt-4 rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
