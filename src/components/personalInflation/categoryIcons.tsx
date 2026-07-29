// Minimal line-icon set, one per official CPI group (keyed by groupNo).
// Hand-rolled to match this codebase's existing icon convention (see
// TrendIndicator.tsx's TrendArrowIcon) rather than adding an icon-library
// dependency for 12 glyphs — stroke-based, 24x24, currentColor, so each
// icon inherits its category's accent color from the parent.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

const ICONS: Record<number, (props: IconProps) => React.ReactElement> = {
  // 1. Food & Non-Alcoholic Beverages — fork & knife
  1: (p) => (
    <Base {...p}>
      <path d="M7 3v7a2 2 0 0 0 2 2v9M7 3v7M9 3v7" />
      <path d="M16 3v18M16 3c-1.5 0-2.5 1.5-2.5 4s1 4 2.5 4" />
    </Base>
  ),
  // 2. Alcoholic Beverages & Tobacco — glass
  2: (p) => (
    <Base {...p}>
      <path d="M6 3h12l-1.5 12a3.5 3.5 0 0 1-3.5 3h-2a3.5 3.5 0 0 1-3.5-3L6 3Z" />
      <path d="M9 21h6M12 18v3" />
    </Base>
  ),
  // 3. Clothing & Footwear — shirt
  3: (p) => (
    <Base {...p}>
      <path d="M8 4 4 7l2 3 2-1.2V21h8V8.8L18 10l2-3-4-3-2 2h-4L8 4Z" />
    </Base>
  ),
  // 4. Housing, Water, Electricity, Gas & Fuels — house
  4: (p) => (
    <Base {...p}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-6h4v6" />
    </Base>
  ),
  // 5. Furnishing & Household Equipment Maintenance — lamp
  5: (p) => (
    <Base {...p}>
      <path d="M8 4h8l-2 6H10L8 4Z" />
      <path d="M12 10v8" />
      <path d="M8 21h8" />
      <path d="M9 18h6" />
    </Base>
  ),
  // 6. Health — heartbeat pulse
  6: (p) => (
    <Base {...p}>
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </Base>
  ),
  // 7. Transport — car
  7: (p) => (
    <Base {...p}>
      <path d="M4 16V11l2-5h12l2 5v5" />
      <path d="M4 16h16" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </Base>
  ),
  // 8. Communication — phone/signal
  8: (p) => (
    <Base {...p}>
      <path d="M6 3h5l1 4-2.5 2a10 10 0 0 0 5.5 5.5l2-2.5 4 1v5a2 2 0 0 1-2 2C11 20 4 13 4 5a2 2 0 0 1 2-2Z" />
    </Base>
  ),
  // 9. Recreation & Culture — ticket
  9: (p) => (
    <Base {...p}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
      <path d="M10 6v12" strokeDasharray="2 3" />
    </Base>
  ),
  // 10. Education — graduation cap
  10: (p) => (
    <Base {...p}>
      <path d="M2 9 12 5l10 4-10 4-10-4Z" />
      <path d="M6 11v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
      <path d="M22 9v6" />
    </Base>
  ),
  // 11. Restaurants & Hotels — cup + plate
  11: (p) => (
    <Base {...p}>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 6V3M9 4.5V3M15 4.5V3" />
    </Base>
  ),
  // 12. Miscellaneous — grid of dots
  12: (p) => (
    <Base {...p}>
      <circle cx="6" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="6" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </Base>
  ),
};

export function CategoryIcon({ groupNo, className = "h-4 w-4" }: { groupNo: number; className?: string }) {
  const Icon = ICONS[groupNo];
  if (!Icon) return null;
  return <Icon className={className} />;
}
