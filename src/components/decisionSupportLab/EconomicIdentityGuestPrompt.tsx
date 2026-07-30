import Link from "next/link";
import { T } from "@/components/T";

/**
 * Replaces EconomicIdentityPanel for signed-out visitors — the brief
 * explicitly lists "Accessing Economic Identity" among the guest-blocked
 * capabilities. Rather than rendering a disabled/greyed-out form (which
 * would still leak the field layout and invite a guest to type into
 * something that silently does nothing), this is a clean locked-state
 * card matching the panel's own dimensions and copy register.
 */
export default function EconomicIdentityGuestPrompt() {
  return (
    <section className="glass-card flex flex-col items-start gap-3 rounded-xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white light:text-slate-900">
        <T tKey="decisionSupportLab.identityTitle" />
      </h2>
      <p className="max-w-2xl text-sm text-white/55 light:text-slate-500">
        <T tKey="decisionSupportLab.identityGuestDesc" />
      </p>
      <Link
        href="/signup?redirect=/decision-support-lab"
        className="mt-1 rounded-lg bg-neon-blue px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <T tKey="decisionSupportLab.identityGuestCta" />
      </Link>
    </section>
  );
}
