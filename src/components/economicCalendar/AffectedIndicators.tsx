import Link from "next/link";
import type { IndicatorLink } from "@/lib/economicCalendar/indicatorConnections";

/** "Affected Indicators" — what else moves when this release lands, each linking to its own EIC page where one exists. Connects the Economic Calendar to the rest of the platform (Indicator Connection Engine). */
export default function AffectedIndicators({ indicators }: { indicators: IndicatorLink[] }) {
  if (indicators.length === 0) return null;
  return (
    <section className="glass-card mt-6 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white light:text-slate-900">Affected Indicators</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {indicators.map((indicator) =>
          indicator.href ? (
            <Link
              key={indicator.label}
              href={indicator.href}
              className="rounded-full border border-neon-blue/20 bg-neon-blue/5 px-3 py-1.5 text-sm text-neon-blue transition-colors hover:bg-neon-blue/10"
            >
              {indicator.label} →
            </Link>
          ) : (
            <span key={indicator.label} className="rounded-full border border-white/10 light:border-slate-200 px-3 py-1.5 text-sm text-white/60 light:text-slate-500">
              {indicator.label}
            </span>
          ),
        )}
      </div>
    </section>
  );
}
