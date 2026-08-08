import { T } from "@/components/T";
import { PROVENANCE_SOURCE_LABEL, type ProvenanceEntry } from "@/lib/decisionSupportLab/provenance";

export interface MathVariable {
  symbol: string;
  description: string;
}

export interface ExplainTheMathProps {
  formula: string;
  variables: MathVariable[];
  methodology: string;
  sourceName: string;
  sourceUrl?: string;
  lastUpdated: string;
  /** e.g. "Monthly" — how often the underlying official data itself refreshes (Phase 2 addition, optional so Phase 1 call sites keep compiling unchanged). */
  dataFrequency?: string;
  /** Plain-English assumptions the calculation makes (e.g. "Assumes your reported spending share stays constant across the period"). */
  assumptions?: string[];
  /** Known limitations/caveats — institutional transparency about what this number does NOT capture. */
  limitations?: string[];
  /** Per-input sourced-values table (Phase 6 addition) — where each number fed into this specific calculation actually came from. See provenance.ts; optional so every existing call site keeps compiling unchanged. */
  provenance?: ProvenanceEntry[];
}

/**
 * The Decision Support Lab's one shared "how is this calculated" panel —
 * every current and future tool renders its formula/variables/methodology/
 * source through this exact component (props only, no tool-specific
 * markup baked in) rather than each tool hand-rolling its own version of
 * this block.
 */
export default function ExplainTheMath({
  formula,
  variables,
  methodology,
  sourceName,
  sourceUrl,
  lastUpdated,
  dataFrequency,
  assumptions,
  limitations,
  provenance,
}: ExplainTheMathProps) {
  return (
    <section className="glass-card rounded-xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white light:text-slate-900">
        <T tKey="decisionSupportLab.explainTheMathTitle" />
      </h2>

      <div className="text-mono-num mt-4 overflow-x-auto rounded-lg bg-[var(--surface-2)] px-4 py-3 text-sm text-white/85 light:text-slate-800">
        {formula}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {variables.map((v) => (
          <div key={v.symbol} className="flex items-baseline gap-2 text-sm">
            <dt className="text-mono-num shrink-0 font-semibold text-neon-blue">{v.symbol}</dt>
            <dd className="text-white/60 light:text-slate-500">{v.description}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-sm leading-relaxed text-white/60 light:text-slate-500">{methodology}</p>

      {assumptions && assumptions.length > 0 && (
        <div className="mt-4">
          <p className="text-label text-white/40 light:text-slate-400">
            <T tKey="decisionSupportLab.explainAssumptions" />
          </p>
          <ul className="mt-1.5 list-inside list-disc text-sm leading-relaxed text-white/60 light:text-slate-500">
            {assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {limitations && limitations.length > 0 && (
        <div className="mt-4">
          <p className="text-label text-white/40 light:text-slate-400">
            <T tKey="decisionSupportLab.explainLimitations" />
          </p>
          <ul className="mt-1.5 list-inside list-disc text-sm leading-relaxed text-white/60 light:text-slate-500">
            {limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {provenance && provenance.length > 0 && (
        <div className="mt-4">
          <p className="text-label text-white/40 light:text-slate-400">
            <T tKey="decisionSupportLab.explainProvenance" />
          </p>
          <div className="mt-1.5 overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
            <table className="w-full text-sm">
              <tbody>
                {provenance.map((entry, i) => (
                  <tr key={i} className={i > 0 ? "border-t border-[var(--border-subtle)]" : ""}>
                    <td className="px-3 py-1.5 text-white/60 light:text-slate-500">{entry.label}</td>
                    <td className="text-mono-num px-3 py-1.5 text-right text-white/85 light:text-slate-800">{entry.value}</td>
                    <td className="px-3 py-1.5 text-right text-xs text-white/40 light:text-slate-400">{PROVENANCE_SOURCE_LABEL[entry.source]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="section-divider mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-xs text-white/40 light:text-slate-400">
        <span>
          <T tKey="decisionSupportLab.explainSource" />:
        </span>
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline">
            {sourceName}
          </a>
        ) : (
          <span>{sourceName}</span>
        )}
        {dataFrequency && (
          <>
            <span className="text-white/20 light:text-slate-300">·</span>
            <span>
              <T tKey="decisionSupportLab.explainFrequency" />: {dataFrequency}
            </span>
          </>
        )}
        <span className="text-white/20 light:text-slate-300">·</span>
        <span>
          <T tKey="decisionSupportLab.explainLastUpdated" />: {lastUpdated}
        </span>
      </div>
    </section>
  );
}
