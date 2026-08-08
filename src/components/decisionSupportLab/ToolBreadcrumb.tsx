// Section D1 — "Decision Lab / Category / Tool" wayfinding at the top of
// every tool page; the first segment doubles as the "back to lab" control.
//
// Production polish pass: the previous version was a bare text "←" glyph at
// text-xs/white-40 (12px, ~40% opacity) with zero padding — under the
// 44x44px touch-target minimum, well under WCAG AA contrast on the light
// theme (~2.9:1), no focus-visible style, and no aria-current on the active
// segment. It also sat flush at the top of <main>, directly under
// MobileNav's fixed hamburger button (top-3 left-3, 44x44) on every one of
// the ~26 pages that render this first — the two visually collided on
// mobile. Fixed here: a real icon + larger/higher-contrast label with a
// proper touch target, a focus ring, aria-current, and top clearance on
// mobile that disappears at the same min-[800px] breakpoint TopNav/MobileNav
// already switch on.
import Link from "next/link";
import { T } from "@/components/T";
import { DECISION_SUPPORT_TOOLS, TOOL_CATEGORIES } from "@/lib/decisionSupportLab/tools";

interface Props {
  toolId: string;
}

function BackArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M13 8H3M3 8L7.5 3.5M3 8L7.5 12.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ToolBreadcrumb({ toolId }: Props) {
  const tool = DECISION_SUPPORT_TOOLS.find((t) => t.id === toolId);
  const category = tool ? TOOL_CATEGORIES.find((c) => c.id === tool.category) : undefined;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1 pt-16 text-sm font-medium min-[800px]:pt-0"
    >
      <Link
        href="/decision-support-lab"
        aria-label="Back to Decision Support Lab"
        className="-ml-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-3 text-white/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-blue light:text-slate-700 light:hover:bg-slate-900/5 light:hover:text-slate-900"
      >
        <BackArrowIcon />
        <T tKey="decisionSupportLab.title" />
      </Link>
      {category && (
        <>
          <span aria-hidden="true" className="text-white/25 light:text-slate-300">/</span>
          <span className="text-white/60 light:text-slate-500">
            <T tKey={category.titleKey} />
          </span>
        </>
      )}
      {tool && (
        <>
          <span aria-hidden="true" className="text-white/25 light:text-slate-300">/</span>
          <span aria-current="page" className="text-white light:text-slate-900">
            <T tKey={tool.titleKey} />
          </span>
        </>
      )}
    </nav>
  );
}
