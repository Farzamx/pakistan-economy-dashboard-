// Phase M1 §4, fixed in Phase 6A.1 — collapses a group of secondary
// sections behind a "View more" toggle on mobile only, always visible on
// desktop.
//
// Originally built on <details>, on the (incorrect) assumption that a CSS
// `display` override on the content div would force it visible on desktop
// regardless of the <details>'s own open state. Confirmed via a real
// browser check this was wrong: a <details> without the `open` attribute
// collapses to zero height in normal layout flow — the browser removes its
// children from layout entirely, and no CSS on a descendant can undo that.
// The content was therefore invisible on desktop too (not just impossible
// to scroll to), which is why four whole sections (Core & Wholesale
// Prices, Monetary Policy & Money Markets, Global Markets, Real Economy &
// Fiscal) disappeared from the desktop dashboard.
//
// Fixed with the checkbox-toggle pattern instead: a hidden checkbox has no
// such native collapsing behavior on its siblings, so `peer-checked:block`
// behaves exactly like ordinary CSS, with no browser-semantic trap. Still
// pure CSS, zero JavaScript, zero hydration risk — no `checked` attribute
// is set server-side, so every visitor gets identical server-rendered HTML;
// only the CSS cascade differs per breakpoint/interaction.
import type { ReactNode } from "react";
import { useId } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

export default function MobileCollapsibleGroup({ label, children }: Props) {
  const id = useId();
  return (
    <div className="group">
      <input type="checkbox" id={id} className="peer hidden" />
      <label
        htmlFor={id}
        className="mt-6 flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-white/70 light:text-slate-600 min-[800px]:hidden peer-checked:[&>span]:rotate-90"
      >
        {label}
        <span aria-hidden="true" className="text-white/40 transition-transform">
          ›
        </span>
      </label>
      <div className="hidden peer-checked:block min-[800px]:block">{children}</div>
    </div>
  );
}
