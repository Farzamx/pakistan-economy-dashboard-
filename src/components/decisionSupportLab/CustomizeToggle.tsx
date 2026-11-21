"use client";

// The two-way switch every customizable Lab value shares: "Current <thing>" (what we already know) or "Customize <thing>" (type your own to see how the result changes).
// It is a labelled pair of buttons rather than a bare checkbox so the choice is visible without hunting for it, and the Customize side carries a pencil
// so it reads as "you can edit this".
interface Props {
  currentLabel: string;
  customizeLabel: string;
  isCustom: boolean;
  onChange: (isCustom: boolean) => void;
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M11.5 2.5l2 2L5 13l-2.8.8L3 11l8.5-8.5z" />
    </svg>
  );
}

export default function CustomizeToggle({ currentLabel, customizeLabel, isCustom, onChange }: Props) {
  const base = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-center text-xs font-medium leading-tight transition-colors";
  const on = "bg-neon-blue/20 text-neon-blue";
  const off = "text-white/55 hover:text-white/85 light:text-slate-500 light:hover:text-slate-700";
  return (
    <div role="group" aria-label={`${currentLabel} / ${customizeLabel}`} className="grid w-full grid-cols-2 gap-0.5 rounded-lg border border-[var(--border-subtle)] p-0.5 sm:inline-grid sm:w-auto sm:self-start">
      <button type="button" aria-pressed={!isCustom} onClick={() => onChange(false)} className={`${base} ${!isCustom ? on : off}`}>
        {currentLabel}
      </button>
      <button type="button" aria-pressed={isCustom} onClick={() => onChange(true)} className={`${base} ${isCustom ? on : off}`}>
        <PencilIcon />
        {customizeLabel}
      </button>
    </div>
  );
}
