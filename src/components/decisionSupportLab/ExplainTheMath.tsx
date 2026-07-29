import { T } from "@/components/T";

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
}

/**
 * The Decision Support Lab's one shared "how is this calculated" panel —
 * every current and future tool renders its formula/variables/methodology/
 * source through this exact component (props only, no tool-specific
 * markup baked in) rather than each tool hand-rolling its own version of
 * this block.
 */
export default function ExplainTheMath({ formula, variables, methodology, sourceName, sourceUrl, lastUpdated }: ExplainTheMathProps) {
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
        <span className="text-white/20 light:text-slate-300">·</span>
        <span>
          <T tKey="decisionSupportLab.explainLastUpdated" />: {lastUpdated}
        </span>
      </div>
    </section>
  );
}
