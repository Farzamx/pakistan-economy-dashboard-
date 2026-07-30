import Link from "next/link";
import { T } from "@/components/T";

/**
 * Shown only to signed-out visitors on the Lab's landing page — the
 * landing page itself, feature descriptions, and methodology stay public
 * (Phase 3 brief), but every calculator behind it requires an account.
 * proxy.ts is the real enforcement (see protectedSections.ts's
 * PROTECTED_SUBSECTIONS); this banner is the honest, upfront explanation
 * of why, rather than letting a guest discover the wall only after
 * clicking into a tool.
 */
export default function DecisionSupportGuestBanner() {
  return (
    <section className="glass-card flex flex-col items-start gap-4 rounded-xl border-neon-blue/20 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-white light:text-slate-900">
          <T tKey="decisionSupportLab.guestBannerTitle" />
        </h2>
        <p className="mt-1 max-w-xl text-sm text-white/60 light:text-slate-500">
          <T tKey="decisionSupportLab.guestBannerDesc" />
        </p>
      </div>
      <div className="flex shrink-0 gap-2.5">
        <Link
          href="/login?redirect=/decision-support-lab"
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-neon-blue light:text-slate-700"
        >
          <T tKey="common.login" />
        </Link>
        <Link
          href="/signup?redirect=/decision-support-lab"
          className="rounded-lg bg-neon-blue px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <T tKey="common.signup" />
        </Link>
      </div>
    </section>
  );
}
