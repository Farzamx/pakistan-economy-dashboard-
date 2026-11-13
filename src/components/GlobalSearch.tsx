"use client";

// Global jump-search (Search Experience pass) — every entry below is a
// real, already-existing destination (a homepage anchor or a real route),
// matched by substring against its label/keywords. No fabricated results:
// if a query doesn't match anything in SEARCH_INDEX, the dropdown just
// shows "No matches" rather than inventing a destination.
//
// Everyone searches the COMPLETE index, signed in or not (G.21): a guest may find a protected dashboard, workshop or tool. An entry is only a label and an
// address; no page data is ever part of a result. Choosing a protected result as a guest opens the sign-in dialog instead of the page (the host's handler, below).
//
// Deliberately has no auth/protected-route logic of its own — nearly every
// destination is a protected path, and the shell's useGuestGate (AppHeader,
// MobileDrawer) already has a correct, tested click
// handler for that (MobileNav's in particular works around a real race
// between drawer-unmount and Next's <Link> navigation). Re-implementing a
// third version here risked reintroducing that bug, so this component
// takes the host's handler as a prop and calls it instead.

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { SEO_PAGES } from "@/lib/seoConfig";
import { APP_NAV, allNavLinks, hrefPath } from "@/lib/appNav";
import { en } from "@/lib/i18n/translations/en";
import { SEARCH_DESTINATIONS } from "@/lib/searchDestinations";

export interface SearchEntry {
  label: string;
  href: string;
  keywords?: string[];
}

/** Extra terms for the Inflation Rate page (Core and Food Inflation have their own entries). */
export const INFLATION_RATE_SEARCH_ALIASES = ["CPI Inflation", "Headline Inflation"];

/** Terms that lead to the Fed Funds Rate page. */
export const FED_FUNDS_SEARCH_ALIASES = ["Federal Funds Rate", "US Interest Rate", "US Policy Rate", "FOMC"];

/** Terms that lead to the Core Inflation and Food Inflation pages. */
export const CORE_INFLATION_SEARCH_ALIASES = ["NFNE", "Non-Food Non-Energy"];

/** Terms that lead to the Bond Yields workshop. */
export const BOND_YIELDS_SEARCH_ALIASES = ["T-Bills", "Treasury Bills", "PIB", "Yield Curve", "Government Bonds", "Auction Yields"];

/** Terms that lead to the Budget Tracker. (Tax Money and Debt vs Defence have their own entries.) */
export const BUDGET_TRACKER_SEARCH_ALIASES = ["Budget", "Federal Budget", "Budget Sankey"];

export const SEARCH_INDEX: SearchEntry[] = [
  { label: "Overview", href: "/overview#overview" },
  { label: "Risk Intelligence", href: "/overview#risk-intelligence" },
  { label: "GDP", href: "/overview#gdp", keywords: ["GDP Growth"] },
  { label: "Inflation", href: "/overview#inflation", keywords: ["CPI"] },
  { label: "Prices", href: "/overview#price-indices", keywords: ["WPI", "Wholesale"] },
  { label: "Monetary Policy", href: "/overview#monetary-policy", keywords: ["Policy Rate", "KIBOR", "T-Bill", "PIB", "Interest Rate"] },
  { label: "Global Markets", href: "/overview#global-markets", keywords: ["Gold", "Oil", "Brent", "WTI"] },
  { label: "Real Economy", href: "/overview#real-economy" },
  { label: "Reserves", href: "/overview#reserves", keywords: ["Foreign Exchange Reserves", "Foreign Reserves"] },
  { label: "FX Rates", href: "/overview#live-fx" },
  { label: "Exchange Rate", href: "/overview#exchange-rate", keywords: ["USD/PKR", "PKR"] },
  { label: "Remittances", href: "/overview#remittances" },
  { label: "External Sector", href: "/overview#external-sector", keywords: ["Current Account", "Trade Balance"] },
  { label: "News", href: "/overview#news-intelligence" },
  { label: "Economic Calendar", href: "/economic-calendar", keywords: ["SBP Meeting", "CPI Release", "Events", "Calendar"] },
  { label: "Decision Support Lab", href: "/decision-support-lab", keywords: ["Decision Lab", "Calculators", "Tools"] },
  { label: "Comparisons", href: "/comparisons" },
  { label: "Budget Tracker", href: "/budget", keywords: BUDGET_TRACKER_SEARCH_ALIASES },
  { label: "Where Does the Tax Money Go?", href: "/budget/where-does-tax-money-go", keywords: ["Tax Money", "Federal Budget", "Budget Explainer", "Budget Tracker"] },
  { label: "Debt Servicing vs Defence", href: "/budget/debt-servicing-vs-defence", keywords: ["Debt vs Defence", "Defence Spending", "Debt Servicing", "Budget Explainer", "Budget Tracker"] },
  { label: "Provincial Budget", href: "/provincial-budget", keywords: ["Budget"] },
  { label: "Punjab Budget", href: "/provincial-budget/punjab", keywords: ["Provincial Budget"] },
  { label: "Sindh Budget", href: "/provincial-budget/sindh", keywords: ["Provincial Budget"] },
  { label: "Khyber Pakhtunkhwa Budget", href: "/provincial-budget/kp", keywords: ["KPK", "KP", "Provincial Budget"] },
  { label: "Balochistan Budget", href: "/provincial-budget/balochistan", keywords: ["Provincial Budget"] },
  // Every individual indicator detail page (SeoPageLayout-driven) — derived
  // from the single SEO_PAGES registry so a new page added there is
  // automatically searchable with zero changes needed here. Core Inflation, Food
  // Inflation and the Fed Funds Rate are listed like every other indicator (G.21).
  ...SEO_PAGES.map((p) => ({
    label: p.label,
    href: `/${p.slug}`,
    ...(p.slug === "inflation-rate-pakistan" ? { keywords: INFLATION_RATE_SEARCH_ALIASES } : {}),
    ...(p.slug === "fed-funds-rate" ? { keywords: FED_FUNDS_SEARCH_ALIASES } : {}),
    ...(p.slug === "pakistan-core-inflation" || p.slug === "pakistan-food-inflation" ? { keywords: CORE_INFLATION_SEARCH_ALIASES } : {}),
    ...(p.slug === "pakistan-bond-yields" ? { keywords: BOND_YIELDS_SEARCH_ALIASES } : {}),
    ...(p.slug === "pakistan-interest-rate" ? { keywords: ["Policy Rate", "SBP Rate"] } : {}),
  })),
];

// ── What a visitor can search ──────────────────────────────────────────────
// Everyone searches the complete index, guests included (the navigation is complete for everyone; choosing a protected result signs a guest in first, see
// onLinkClick below). The legacy "/overview#gdp"-style anchors (sections the Overview no longer has) are replaced by entries for the sections it does have.

/** Overview sections that exist today, searchable by the topics they carry. Every anchor is checked against the page source by a test. */
const OVERVIEW_SECTION_ENTRIES: SearchEntry[] = [
  { label: "Overview", href: "/overview#overview" },
  { label: "Markets", href: "/overview#home-markets", keywords: ["FX Rates", "Exchange Rate", "USD/PKR", "PKR", "Gold", "Silver", "Oil", "Brent", "WTI", "DXY", "Global Markets", "Stock Market", "PSX"] },
  { label: "Pakistan snapshot", href: "/overview#home-snapshot", keywords: ["Inflation", "CPI", "Core Inflation", "Policy Rate", "Reserves", "Foreign Reserves", "Remittances", "Current Account", "Fiscal Balance"] },
  { label: "Headlines", href: "/overview#home-headlines", keywords: ["News"] },
  { label: "Upcoming releases", href: "/overview#home-releases", keywords: ["Calendar", "SBP Meeting", "CPI Release", "Events"] },
  { label: "Macro intelligence", href: "/overview#home-macro-brief", keywords: ["Macro Brief", "Risk"] },
  { label: "Pakistan indicators", href: "/overview#home-indicators", keywords: ["Indicators", "WPI", "Wholesale", "T-Bill", "PIB", "Bond Yields", "Interest Rate", "M2", "Money Supply", "Exports", "Imports", "Trade", "LSM", "REER", "FDI"] },
];

/** English text for a translation key such as "nav.indicators" (search results are not translated, like the rest of this index). */
function englishText(key: string): string {
  return (key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en) as string | undefined) ?? key;
}

/** Every link in the navigation registry (a menu entry is a search result too), except in-page anchors and the "Back to site" link. */
const NAV_ENTRIES: SearchEntry[] = allNavLinks(APP_NAV)
  .filter((l) => !l.href.includes("#") && l.href !== "/home")
  .map((l) => ({ label: l.label ?? englishText(l.labelKey ?? l.id), href: l.href }));

/** Merge entries that point at the same page: the first label wins, keywords are combined. */
function mergeByDestination(entries: SearchEntry[]): SearchEntry[] {
  const byPath = new Map<string, SearchEntry>();
  for (const e of entries) {
    const key = e.href.startsWith("/overview#") ? e.href : hrefPath(e.href);
    const have = byPath.get(key);
    if (!have) byPath.set(key, { ...e, keywords: e.keywords ? [...e.keywords] : undefined });
    else if (e.keywords) have.keywords = [...new Set([...(have.keywords ?? []), ...e.keywords])];
  }
  return [...byPath.values()];
}

/**
 * The index everyone searches, signed in or not: the Overview's real sections, then the hand-written entries, then every navigation link, every indicator
 * page, and every other existing destination (Decision Lab tools, budget categories, comparisons, provincial pages, information pages).
 */
export const SITE_SEARCH_INDEX: SearchEntry[] = mergeByDestination([
  ...OVERVIEW_SECTION_ENTRIES,
  ...SEARCH_INDEX.filter((e) => !e.href.startsWith("/overview#")),
  ...NAV_ENTRIES,
  ...SEARCH_DESTINATIONS,
]);

export function matches(entry: SearchEntry, query: string): boolean {
  const q = query.toLowerCase();
  if (entry.label.toLowerCase().includes(q)) return true;
  return entry.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
}

/**
 * The matches for a query, best first: an exact label, a label that starts with the query, a label word that starts with it, a label that contains it, then keyword
 * matches (an exact keyword before a partial one); ties keep the index order. Only the best `limit` are shown, so the ordering decides what a visitor sees.
 */
export function rankedMatches(entries: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = (e: SearchEntry): number => {
    const label = e.label.toLowerCase();
    if (label === q) return 0;
    if (label.startsWith(q)) return 1;
    if (label.split(/[^a-z0-9]+/).some((w) => w.startsWith(q))) return 2;
    if (label.includes(q)) return 3;
    const kws = (e.keywords ?? []).map((k) => k.toLowerCase());
    if (kws.includes(q)) return 4;
    if (kws.some((k) => k.includes(q))) return 5;
    return Infinity;
  };
  return entries
    .map((e, i) => ({ e, i, s: score(e) }))
    .filter((x) => x.s !== Infinity)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.e);
}

interface Props {
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  placeholder?: string;
  className?: string;
  /**
   * Visual treatment only — search behaviour is identical in every variant.
   *   "legacy"  — the original sidebar styling (default; unchanged).
   *   "nav"     — sits on the redesigned navy header bar.
   *   "surface" — sits on a redesigned light/dark surface (drawer, header search row).
   */
  variant?: "legacy" | "nav" | "surface";
  autoFocus?: boolean;
}

const INPUT_CLASS: Record<NonNullable<Props["variant"]>, string> = {
  legacy:
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-neon-blue/40",
  nav:
    "w-full rounded-[var(--pe-radius)] border border-pe-nav-border bg-white/10 py-1.5 ps-8 pe-3 text-[13px] text-pe-nav-text outline-none transition-colors placeholder:text-pe-nav-text-muted focus:bg-white/15",
  surface:
    "w-full rounded-[var(--pe-radius)] border border-pe-border-strong bg-pe-surface py-2 ps-8 pe-3 text-[14px] text-pe-text outline-none transition-colors placeholder:text-pe-text-3 focus:border-pe-accent",
};

const ICON_CLASS: Record<NonNullable<Props["variant"]>, string> = {
  legacy: "left-3 text-white/30 light:text-slate-400",
  nav: "start-2.5 text-pe-nav-text-muted",
  surface: "start-2.5 text-pe-text-3",
};

export default function GlobalSearch({ onLinkClick, placeholder, className, variant = "legacy", autoFocus }: Props) {
  const redesigned = variant !== "legacy";
  const { t } = useLanguage();
  const resolvedPlaceholder = placeholder ?? t("search.placeholder");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // Tracks the query that highlightedIndex was last reset for — lets the
  // reset below happen during render (React's documented pattern for
  // "adjusting state when an input changes") instead of in a useEffect,
  // which would call setState synchronously with no async work in between,
  // the same react-hooks/set-state-in-effect purity violation hit
  // repeatedly elsewhere in this codebase this session.
  const [resetForQuery, setResetForQuery] = useState(query);
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim() ? rankedMatches(SITE_SEARCH_INDEX, query) : [];
  const open = focused && query.trim().length > 0;

  if (query !== resetForQuery) {
    setResetForQuery(query);
    setHighlightedIndex(0);
  }

  function go(e: React.MouseEvent<HTMLAnchorElement> | null, href: string) {
    if (e) onLinkClick(e, href);
    setQuery("");
    inputRef.current?.blur();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const index = results[highlightedIndex] ? highlightedIndex : 0;
    const selected = results[index];
    if (!selected) return;
    // Drive the keyboard path through the very same <a> the mouse path
    // already uses, instead of router.push()-ing straight at the href.
    // onLinkClick — the host's handler, from Sidebar/MobileNav — is what
    // turns a protected destination into the GuestAccessModal for a
    // signed-out visitor (and what works around MobileNav's
    // drawer-unmount race). router.push() bypassed it entirely, so
    // pressing Enter on "Budget Tracker" hard-navigated out to /login
    // while clicking that identical row opened the intended modal. This
    // component is documented above as deliberately delegating that
    // decision to its host; the Enter path simply wasn't honouring it.
    const anchor = document.getElementById(`${listId}-${index}`)?.querySelector("a");
    if (anchor) {
      anchor.click(); // -> onClick -> go() -> onLinkClick, then <Link> navigates
      return;
    }
    // Defensive fallback only — reached if the list isn't in the DOM.
    setQuery("");
    inputRef.current?.blur();
    router.push(selected.href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Escape") {
      setQuery("");
      inputRef.current?.blur();
    }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <form onSubmit={handleSubmit} role="search">
        <div className="relative">
          <svg
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${ICON_CLASS[variant]}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && results[highlightedIndex] ? `${listId}-${highlightedIndex}` : undefined}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            aria-label={resolvedPlaceholder}
            autoFocus={autoFocus}
            className={INPUT_CLASS[variant]}
          />
        </div>
      </form>

      {open && (
        // Fully opaque, hardcoded background (not the --surface token,
        // which is ~4% white in dark mode) — this floats directly over the
        // sidebar's own nav links with no darkening backdrop behind it, so
        // anything less than fully solid lets that nav text bleed through
        // and visually merge with the suggestions. Same pattern already
        // used by MobileNav.tsx's drawer panel for the same reason.
        <ul
          id={listId}
          role="listbox"
          className={
            redesigned
              ? "pe-panel absolute inset-x-0 top-full isolate z-40 mt-1 max-h-72 overflow-y-auto rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface py-1 text-pe-text shadow-[var(--pe-shadow-pop)]"
              : "absolute left-0 right-0 top-full isolate z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-neon-blue/25 bg-[#05060f] light:bg-white py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.55),0_0_0_1px_rgba(56,189,248,0.08)] light:shadow-xl"
          }
        >
          {results.length === 0 ? (
            <li className={redesigned ? "px-3 py-2 text-[13px] text-pe-text-3" : "px-3 py-2 text-xs text-[var(--text-muted)]"}>{t("search.noMatches")}</li>
          ) : (
            results.map((entry, i) => (
              <li key={entry.href} id={`${listId}-${i}`} role="option" aria-selected={i === highlightedIndex}>
                <Link
                  href={entry.href}
                  onClick={(e) => go(e, entry.href)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={
                    redesigned
                      ? `block px-3 py-1.5 text-[13px] transition-colors ${i === highlightedIndex ? "bg-pe-surface-2 text-pe-accent" : "text-pe-text-2"}`
                      : `block px-3 py-2 text-xs transition-colors ${
                          i === highlightedIndex
                            ? "bg-neon-blue/15 text-neon-blue"
                            : "text-[var(--text-secondary)] hover:bg-neon-blue/10 hover:text-neon-blue"
                        }`
                  }
                >
                  {entry.label}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
