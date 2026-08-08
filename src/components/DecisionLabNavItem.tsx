"use client";

import Link from "next/link";

interface Props {
  href: string;
  label: string;
  active: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * The Decision Support Lab's distinctive top-nav treatment (Phase 6) —
 * every other TopNav item is plain text with only an active-color change;
 * this one gets a subtle gradient-bordered pill, a small icon, and an
 * animated underline glow, so it reads as PEIC's flagship destination
 * without looking flashy. Deliberately restrained (no motion beyond a
 * hover/active glow, no saturated colors) to stay "institutional," per the
 * explicit brief ("not flashy or distracting"). Kept as its own component
 * (not just extra classes on the shared item) since its markup genuinely
 * differs (icon + pill vs. plain text) — reusing the loop would need an
 * item-type branch either way.
 */
export default function DecisionLabNavItem({ href, label, active, onClick }: Props) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`group relative flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-sm font-medium transition-all duration-200 ${
        active
          ? "border-neon-blue/60 bg-gradient-to-r from-neon-blue/20 to-violet-500/10 text-white shadow-[0_0_10px_rgba(77,141,247,0.3)]"
          : "border-neon-blue/20 bg-gradient-to-r from-neon-blue/5 to-violet-500/5 text-white/65 hover:border-neon-blue/45 hover:text-white hover:shadow-[0_0_8px_rgba(77,141,247,0.2)] light:text-slate-600"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3 w-3 shrink-0 text-neon-blue">
        <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z" />
      </svg>
      {label}
      <span
        aria-hidden="true"
        className={`absolute -bottom-px left-2.5 right-2.5 h-px bg-gradient-to-r from-neon-blue via-violet-400 to-neon-blue transition-opacity duration-200 motion-reduce:transition-none ${
          active ? "opacity-100" : "opacity-0 group-hover:opacity-70"
        }`}
      />
    </Link>
  );
}
