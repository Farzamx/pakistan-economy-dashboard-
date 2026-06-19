import type { ComingSoonComparison } from "@/lib/comparisons/comparisonRegistry";

interface ComingSoonCardProps {
  item: ComingSoonComparison;
}

// Visual language matches PsxComingSoonModal.tsx (the existing "PSX —
// Coming Soon" treatment) — same root cause: PSX/KSE-100 requires a
// commercial data license this project doesn't have.
export default function ComingSoonCard({ item }: ComingSoonCardProps) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center" style={{ minHeight: 220 }}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-blue/20 bg-neon-blue/10">
        <svg className="h-5 w-5 text-neon-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l5-5 4 4 6-7" />
          <path d="M14 9h5v5" />
        </svg>
      </div>
      <span className="inline-flex items-center rounded-full border border-neon-blue/20 bg-neon-blue/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-neon-blue/80">
        Coming Soon
      </span>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h3>
      <p className="max-w-xs text-xs text-[var(--text-muted)]">
        Requires a live PSX (KSE-100) data feed, which needs a commercial data license this dashboard doesn&apos;t currently have.
      </p>
    </div>
  );
}
