import { AUTOMATION_TIER_META } from "@/lib/economicCalendar/economicCalendarRegistry";

/**
 * Renders nothing for "automated" (the majority, expected case) and a
 * visible amber badge for "semi_automated"/"manual" — see AUTOMATION_TIER_META
 * for why. Also renders nothing when the tier is missing (older cached data)
 * rather than guessing, since this component's whole job is to never assert
 * automation status it isn't sure of.
 */
export default function AutomationStatusBadge({ tier }: { tier: string | undefined }) {
  if (!tier || tier === "automated") return null;
  const meta = AUTOMATION_TIER_META[tier as "semi_automated" | "manual"] ?? AUTOMATION_TIER_META.manual;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}
      title="This release is not fully machine-verified — its actual value requires a manual or partially manual update."
    >
      {meta.label}
    </span>
  );
}
