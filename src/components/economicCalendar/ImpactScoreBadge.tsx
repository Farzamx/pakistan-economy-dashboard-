/** "9/10" — the numeric Market Impact Score, shown alongside (not instead of) the High/Medium/Low EventImportanceBadge. */
export default function ImpactScoreBadge({ score }: { score: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-white/10 light:border-slate-200 bg-white/[0.03] light:bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-white/70 light:text-slate-600"
      title="Market Impact Score"
    >
      <span className="text-white light:text-slate-900">{score}</span>
      <span className="text-white/35 light:text-slate-400">/10</span>
    </span>
  );
}
