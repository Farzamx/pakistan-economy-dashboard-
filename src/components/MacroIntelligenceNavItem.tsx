"use client";

import Link from "next/link";

interface Props {
  href: string;
  /** Shown below the 1280px tier, where every px in the nav still matters — matches "Risk Intel"'s existing abbreviation convention in this same bar. */
  shortLabel: string;
  /** Shown at 1280px+, once Markets/Research/Risk Intel have rejoined the bar and there's genuine room for the full product name. */
  longLabel: string;
  active: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Macro Intelligence's top-nav treatment — a twin of DecisionLabNavItem's
 * pill (same restrained gradient border, animated underline glow, no
 * saturated colors), so the two flagship destinations read as the same
 * product tier rather than one being dressed up and the other left plain.
 * Icon is a 2x2 grid rather than DecisionLab's shield — evokes "several
 * independent dimensions read at once" without borrowing DecisionLab's own
 * mark. Kept as its own component for the same reason DecisionLabNavItem
 * is: the markup (icon + pill) genuinely differs from every other item's
 * plain-text treatment.
 *
 * Phase 10 UI refinement: padding steps up at the 1280px tier (px-2.5/py-1.5
 * -> px-3.5/py-2), matching DecisionLabNavItem's own matching step, so the
 * two flagship pills keep an identical rhythm at every width. The label
 * itself also grows at that tier (see shortLabel/longLabel above) since
 * there's finally room for the full "Macro Intelligence" name.
 */
export default function MacroIntelligenceNavItem({ href, shortLabel, longLabel, active, onClick }: Props) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`group relative flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-sm font-medium transition-all duration-200 min-[1280px]:px-3.5 min-[1280px]:py-2 ${
        active
          ? "border-neon-blue/60 bg-gradient-to-r from-neon-blue/20 to-violet-500/10 text-white shadow-[0_0_10px_rgba(77,141,247,0.3)]"
          : "border-neon-blue/20 bg-gradient-to-r from-neon-blue/5 to-violet-500/5 text-white/65 hover:border-neon-blue/45 hover:text-white hover:shadow-[0_0_8px_rgba(77,141,247,0.2)] light:text-slate-600"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3 w-3 shrink-0 text-neon-blue">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
      </svg>
      <span className="min-[1280px]:hidden">{shortLabel}</span>
      <span className="hidden min-[1280px]:inline">{longLabel}</span>
      <span
        aria-hidden="true"
        className={`absolute -bottom-px left-2.5 right-2.5 h-px bg-gradient-to-r from-neon-blue via-violet-400 to-neon-blue transition-opacity duration-200 motion-reduce:transition-none ${
          active ? "opacity-100" : "opacity-0 group-hover:opacity-70"
        }`}
      />
    </Link>
  );
}
