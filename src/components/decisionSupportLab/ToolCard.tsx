import { T } from "@/components/T";
import ProtectedLink from "@/components/ProtectedLink";
import { ToolIcon } from "@/components/decisionSupportLab/toolIcons";
import type { ToolDefinition } from "@/lib/decisionSupportLab/tools";

interface Props {
  tool: ToolDefinition;
  /** Server-computed (no client flash) — purely for the visual "sign in required" treatment. The actual click-time gate is ProtectedLink's own live auth check plus proxy.ts's server-side redirect; this prop never substitutes for either. */
  isAuthenticated: boolean;
}

function LockIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/**
 * One institutional-register tool card — deliberately a single restrained
 * blue accent for every tool (no per-tool rainbow coding) so the grid reads
 * as one coherent product line, matching the Lab's "Bloomberg/IMF/OECD,
 * not a consumer app" design brief. Available tools are a real link;
 * coming-soon cards are static (no href, no hover affordance implying
 * they're clickable).
 *
 * Phase 3: the Lab is now sign-in-gated (protectedSections.ts's
 * PROTECTED_SUBSECTIONS), so an "available" tool renders through
 * ProtectedLink rather than a plain Link — for a signed-in visitor it
 * behaves exactly like Link; for a signed-out one it intercepts the click
 * and shows the same GuestAccessModal every other premium section uses,
 * with proxy.ts's server-side redirect as the backstop for direct links.
 */
export default function ToolCard({ tool, isAuthenticated }: Props) {
  const isAvailable = tool.status === "available";
  const showLock = isAvailable && !isAuthenticated;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue">
          <ToolIcon toolId={tool.id} className="h-5 w-5" />
        </span>
        {isAvailable ? (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            <T tKey="decisionSupportLab.statusAvailable" />
          </span>
        ) : (
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40 light:text-slate-400">
            <T tKey="decisionSupportLab.statusComingSoon" />
          </span>
        )}
      </div>

      <h3 className="mt-4 text-base font-semibold text-white light:text-slate-900">
        <T tKey={tool.titleKey} />
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/55 light:text-slate-500">
        <T tKey={tool.descriptionKey} />
      </p>

      {!isAvailable && tool.estimatedReleaseKey && (
        <p className="mt-4 text-xs font-medium text-white/35 light:text-slate-400">
          <T tKey={tool.estimatedReleaseKey} />
        </p>
      )}
      {isAvailable && !showLock && (
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-neon-blue">
          <T tKey="decisionSupportLab.openTool" /> <span aria-hidden="true">→</span>
        </span>
      )}
      {showLock && (
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
          <LockIcon />
          <T tKey="decisionSupportLab.signInRequired" />
        </span>
      )}
    </>
  );

  if (isAvailable && tool.href) {
    return (
      <ProtectedLink
        href={tool.href}
        className="glass-card flex flex-col rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:border-neon-blue/40 focus-visible:-translate-y-0.5 focus-visible:border-neon-blue/40"
      >
        {body}
      </ProtectedLink>
    );
  }

  return (
    <div className="glass-card flex flex-col rounded-xl p-5 opacity-80" aria-disabled="true">
      {body}
    </div>
  );
}
