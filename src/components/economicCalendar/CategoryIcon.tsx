import type { EventCategory } from "@/lib/economicCalendar/economicCalendarTypes";

interface Props {
  category: EventCategory;
  className?: string;
}

/** Hand-drawn icon per category — same inline-SVG convention used throughout Sidebar.tsx/MobileNav.tsx rather than pulling in an icon library. */
export default function CategoryIcon({ category, className = "h-4 w-4" }: Props) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.75", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (category) {
    case "Inflation":
      return (
        <svg className={className} {...common}>
          <path d="M3 17l5-5 4 4 8-9" />
          <path d="M16 7h5v5" />
        </svg>
      );
    case "Monetary Policy":
      return (
        <svg className={className} {...common}>
          <path d="M12 3l8 4H4l8-4Z" />
          <path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7" />
          <path d="M3 21h18" />
        </svg>
      );
    case "External Sector":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
        </svg>
      );
    case "Fiscal Sector":
      return (
        <svg className={className} {...common}>
          <rect x="3" y="10" width="4" height="10" />
          <rect x="10" y="6" width="4" height="14" />
          <rect x="17" y="13" width="4" height="7" />
        </svg>
      );
    case "Real Economy":
      return (
        <svg className={className} {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 14l3-3 3 2 4-5" />
        </svg>
      );
    case "Financial Markets":
      return (
        <svg className={className} {...common}>
          <path d="M3 16l4.5-7L12 13l4-6L21 8" />
          <path d="M19 4l2 2-2 2M5 16l-2 2 2 2" />
        </svg>
      );
    case "Global Events":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 9h18M3 15h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    default:
      return null;
  }
}
