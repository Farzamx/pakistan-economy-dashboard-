// Macro Intelligence brief for the homepage (PEIC redesign Phase 3).
// Server-compatible (no hooks).
//
// Presentation only. It renders the report buildMacroIntelligenceReport()
// already produced — each dimension's own `state`, `direction` and
// `confidence` — and computes nothing: no scoring, no re-interpretation, no
// methodology. src/lib/intelligence/ is untouched.
//
// Dimensions whose evidence was inadequate carry the engine's own
// "insufficient-data" state. Those are listed separately under a heading
// that names them as a DATA COVERAGE gap, because an indicator the engine
// could not read is not an economic finding — conflating the two would
// misrepresent the analysis.

import Link from "next/link";
import type { IntelligenceSignal } from "@/lib/intelligence/types";

const INSUFFICIENT = "insufficient-data";

const DIRECTION_GLYPH: Record<string, string> = { Rising: "↑", Falling: "↓", Flat: "→", Unknown: "?" };

/** "pressure-easing" -> "pressure easing" — the engine's own state, made readable. */
function readableState(state: string): string {
  return state.replace(/-/g, " ");
}

export default function MacroBrief({ signals, asOf }: { signals: IntelligenceSignal[]; asOf: string }) {
  const rated = signals.filter((s) => s.state !== INSUFFICIENT);
  const unrated = signals.filter((s) => s.state === INSUFFICIENT);

  return (
    <div className="flex flex-col gap-3">
      {rated.length > 0 ? (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {rated.map((signal) => (
            <li key={signal.id} className="flex items-baseline justify-between gap-3 border-b border-pe-border pb-1.5 last:border-0">
              <span className="text-[13px] text-pe-text-2">{signal.label}</span>
              <span className="flex shrink-0 items-baseline gap-1.5">
                <span aria-hidden="true" className="text-[12px] text-pe-text-3">
                  {DIRECTION_GLYPH[signal.direction] ?? "?"}
                </span>
                <span className="text-[13px] font-medium text-pe-text">{readableState(signal.state)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-pe-text-3">No dimension has sufficient evidence to be rated right now.</p>
      )}

      {unrated.length > 0 && (
        <p className="text-[12px] leading-relaxed text-pe-text-3">
          <span className="font-medium text-pe-text-2">Not rated — data coverage:</span>{" "}
          {unrated.map((s) => s.label).join(", ")}. These dimensions lack sufficient recent evidence, which is a gap in
          the inputs rather than an economic signal.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <span className="font-mono text-[11px] text-pe-text-3">Computed {asOf}</span>
        <Link href="/macro-intelligence" className="text-[13px] font-medium text-pe-accent hover:underline">
          Full analysis →
        </Link>
      </div>
    </div>
  );
}
