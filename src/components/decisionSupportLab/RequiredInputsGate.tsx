"use client";

// A2/A1 fix: no tool may render a computed result — or a share card, or an
// export — until every value that formula genuinely depends on has a real
// user entry. Previously several tools computed and displayed a result
// (e.g. "-Rs 4,070 / -40.7%") from a silently-zero rate field the visitor
// never touched. This is the one shared "not enough data yet" state so
// every tool shows the same honest, actionable message instead of a
// misleading number — never Rs 0 / 0.0% / a hidden-default result.
export interface RequiredInput {
  /** The id of the actual <input>/<select> this field lives in, so the "Go to" button can focus it. */
  id: string;
  label: string;
  filled: boolean;
}

interface Props {
  requiredInputs: RequiredInput[];
  children: React.ReactNode;
}

export default function RequiredInputsGate({ requiredInputs, children }: Props) {
  const missing = requiredInputs.filter((r) => !r.filled);
  if (missing.length === 0) return <>{children}</>;

  function focusFirstMissing() {
    const el = document.getElementById(missing[0].id);
    if (el instanceof HTMLElement) el.focus();
  }

  return (
    <div className="glass-card rounded-xl border border-[var(--border-subtle)] p-6 text-center" aria-live="polite">
      <p className="text-sm text-white/60 light:text-slate-500">
        {missing.length === 1 ? `Enter ${missing[0].label.toLowerCase()} to see your result.` : `Enter ${missing.map((m) => m.label.toLowerCase()).join(", ")} to see your result.`}
      </p>
      <button
        type="button"
        onClick={focusFirstMissing}
        className="mt-3 rounded-lg border border-neon-blue/40 px-4 py-2 text-sm font-semibold text-neon-blue transition-colors hover:bg-neon-blue/10"
      >
        Go to {missing[0].label}
      </button>
    </div>
  );
}
