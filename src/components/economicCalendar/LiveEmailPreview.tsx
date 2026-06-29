import { IMPORTANCE_META, SURPRISE_META } from "@/lib/notifications/alertEmailTemplate";

// Visual-only mock of the real alert email (src/lib/notifications/
// alertEmailTemplate.ts) — reuses its exact importance/surprise color
// constants so this never looks inconsistent with what actually lands in
// an inbox, but is built with React/Tailwind rather than the literal
// table-based HTML email markup, which would render oddly embedded in a
// page. No data here is real or fetched; it never sends anything — purely
// illustrative, clearly labeled as a preview.
export default function LiveEmailPreview() {
  const importance = IMPORTANCE_META.High;
  const surprise = SURPRISE_META.positive;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d18]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Example preview</span>
        <span className="text-[11px] text-slate-600">Not a real alert</span>
      </div>

      <div className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-sky-400">🇵🇰 Pakistan Economic Intelligence</p>
        <p className="mt-1 text-base font-bold text-white">Economic Release Alert</p>

        <span
          className="mt-4 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ backgroundColor: importance.bg, color: importance.text }}
        >
          {importance.emoji} High Market Impact
        </span>
        <h3 className="mt-3 text-lg font-bold leading-tight text-white">CPI Inflation Release (July 2026)</h3>
        <p className="mt-0.5 text-xs text-slate-400">Pakistan Bureau of Statistics &middot; 1 Aug 2026 &middot; 12:00 PM PKT</p>

        <div className="mt-4 grid grid-cols-3 gap-0.5 overflow-hidden rounded-lg">
          <div className="bg-white/[0.03] px-2 py-3 text-center">
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Previous</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">6.40%</p>
          </div>
          <div className="bg-white/[0.03] px-2 py-3 text-center">
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Expected</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">6.50%</p>
          </div>
          <div className="bg-sky-400/10 px-2 py-3 text-center">
            <p className="text-[9px] uppercase tracking-wide text-sky-400">Actual</p>
            <p className="mt-1 text-sm font-bold text-sky-400">6.80%</p>
          </div>
        </div>

        <span
          className="mt-3 inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold"
          style={{ backgroundColor: surprise.bg, color: surprise.text }}
        >
          Surprise: +0.30% &middot; {surprise.label}
        </span>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">Higher-than-expected CPI — hawkish for interest rate expectations.</p>

        <div className="mt-4 rounded-lg bg-white/[0.03] py-3 text-center">
          <p className="text-base font-medium text-slate-400">6.40%</p>
          <p className="text-xs text-slate-600">&darr;</p>
          <p className="text-xl font-extrabold text-white">6.80%</p>
        </div>

        <div className="mt-5 flex justify-center">
          <span className="rounded-lg bg-sky-400 px-6 py-2.5 text-sm font-bold text-slate-950">View Full Analysis</span>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Next Scheduled Release</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">Core Inflation Release (July 2026)</p>
          <p className="text-xs text-slate-400">1 Aug 2026 &middot; 12:00 PM PKT</p>
        </div>
      </div>
    </div>
  );
}
