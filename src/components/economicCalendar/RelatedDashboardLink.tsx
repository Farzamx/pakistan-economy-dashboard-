import Link from "next/link";

/** "Event → Related Dashboard" — the single most relevant deep link into the rest of EIC for this series (Platform Integration). */
export default function RelatedDashboardLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="glass-card mt-6 flex items-center justify-between gap-3 p-4 transition-colors hover:border-neon-blue/30"
    >
      <span className="text-sm text-white/60 light:text-slate-500">Go deeper on this topic</span>
      <span className="flex items-center gap-1.5 text-sm font-semibold text-neon-blue">
        {label}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
