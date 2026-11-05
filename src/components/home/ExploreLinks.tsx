// "Explore further" entry points for the homepage (PEIC redesign Phase 3).
// Server-compatible (no hooks).
//
// Every destination is an existing route, and each is also present in
// src/lib/appNav.ts — whose test suite checks each href against the real
// route files, so a dead link here fails the tests rather than shipping.
// Protected destinations are deliberately absent: the guest-access modal
// lives on the navigation's own click handling, not on static page links.

import Link from "next/link";

const LINKS: { href: string; label: string; description: string }[] = [
  { href: "/pakistan-economic-indicators", label: "Indicators A–Z", description: "Every tracked series" },
  { href: "/macro-intelligence", label: "Macro Intelligence", description: "Seven-dimension regime read" },
  { href: "/comparisons", label: "Comparisons", description: "Two series, one chart" },
  { href: "/budget", label: "Budget Tracker", description: "Federal spending and revenue" },
  { href: "/provincial-budget", label: "Provincial Budgets", description: "All four provinces" },
  { href: "/decision-support-lab", label: "Decision Lab", description: "Calculators and planners" },
  { href: "/academy", label: "Academy", description: "Learn how to read the data" },
  { href: "/economic-calendar", label: "Economic Calendar", description: "Scheduled releases" },
];

export default function ExploreLinks() {
  return (
    <ul className="grid grid-cols-1 gap-px bg-pe-border sm:grid-cols-2 lg:grid-cols-4">
      {LINKS.map((link) => (
        <li key={link.href} className="bg-pe-surface">
          <Link href={link.href} className="flex h-full flex-col gap-0.5 p-3 hover:bg-pe-surface-2">
            <span className="text-[13px] font-medium text-pe-text">{link.label}</span>
            <span className="text-[12px] leading-snug text-pe-text-3">{link.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
