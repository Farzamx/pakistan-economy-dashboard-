import type { EventCategory } from "@/lib/economicCalendar/economicCalendarTypes";
import { EVENT_CATEGORIES, CATEGORY_BADGE_CLASS } from "@/lib/economicCalendar/economicCalendarRegistry";
import CategoryIcon from "./CategoryIcon";

export default function EventCategoryBadge({ category }: { category: EventCategory }) {
  const meta = EVENT_CATEGORIES[category];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE_CLASS[meta.color]}`}>
      <CategoryIcon category={category} className="h-3 w-3" />
      {meta.label}
    </span>
  );
}
