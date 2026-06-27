"use client";

// Global jump-search (Search Experience pass) — every entry below is a
// real, already-existing destination (a homepage anchor or a real route),
// matched by substring against its label/keywords. No fabricated results:
// if a query doesn't match anything in SEARCH_INDEX, the dropdown just
// shows "No matches" rather than inventing a destination.
//
// Deliberately has no auth/protected-route logic of its own — Budget
// Tracker and Provincial Budget entries are protected paths, and both
// Sidebar.tsx and MobileNav.tsx already have a correct, tested click
// handler for that (MobileNav's in particular works around a real race
// between drawer-unmount and Next's <Link> navigation). Re-implementing a
// third version here risked reintroducing that bug, so this component
// takes the host's handler as a prop and calls it instead.

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface SearchEntry {
  label: string;
  href: string;
  keywords?: string[];
}

export const SEARCH_INDEX: SearchEntry[] = [
  { label: "Overview", href: "/#overview" },
  { label: "Risk Intelligence", href: "/#risk-intelligence" },
  { label: "GDP", href: "/#gdp", keywords: ["GDP Growth"] },
  { label: "Inflation", href: "/#inflation", keywords: ["CPI"] },
  { label: "Prices", href: "/#price-indices", keywords: ["Core Inflation", "WPI", "Wholesale"] },
  { label: "Monetary Policy", href: "/#monetary-policy", keywords: ["Policy Rate", "KIBOR", "T-Bill", "PIB", "Interest Rate"] },
  { label: "Global Markets", href: "/#global-markets", keywords: ["Gold", "Oil", "Brent", "WTI"] },
  { label: "Real Economy", href: "/#real-economy" },
  { label: "Reserves", href: "/#reserves", keywords: ["Foreign Exchange Reserves", "Foreign Reserves"] },
  { label: "Live FX", href: "/#live-fx" },
  { label: "Exchange Rate", href: "/#exchange-rate", keywords: ["USD/PKR", "PKR"] },
  { label: "Remittances", href: "/#remittances" },
  { label: "External Sector", href: "/#external-sector", keywords: ["Current Account", "Trade Balance"] },
  { label: "News", href: "/#news-intelligence" },
  { label: "Economic Calendar", href: "/economic-calendar", keywords: ["SBP Meeting", "CPI Release", "Events", "Calendar"] },
  { label: "Comparisons", href: "/comparisons" },
  { label: "Budget Tracker", href: "/budget", keywords: ["Budget", "Federal Budget"] },
  { label: "Provincial Budget", href: "/provincial-budget", keywords: ["Budget"] },
  { label: "Punjab Budget", href: "/provincial-budget/punjab", keywords: ["Provincial Budget"] },
  { label: "Sindh Budget", href: "/provincial-budget/sindh", keywords: ["Provincial Budget"] },
  { label: "Khyber Pakhtunkhwa Budget", href: "/provincial-budget/kp", keywords: ["KPK", "KP", "Provincial Budget"] },
  { label: "Balochistan Budget", href: "/provincial-budget/balochistan", keywords: ["Provincial Budget"] },
];

function matches(entry: SearchEntry, query: string): boolean {
  const q = query.toLowerCase();
  if (entry.label.toLowerCase().includes(q)) return true;
  return entry.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
}

interface Props {
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  placeholder?: string;
  className?: string;
}

export default function GlobalSearch({ onLinkClick, placeholder = "Search GDP, Inflation, Budget...", className }: Props) {
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

  const results = query.trim() ? SEARCH_INDEX.filter((e) => matches(e, query)).slice(0, 8) : [];
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
    const selected = results[highlightedIndex] ?? results[0];
    if (!selected) return;
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
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30 light:text-slate-400"
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
            placeholder={placeholder}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-neon-blue/40"
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
          className="absolute left-0 right-0 top-full isolate z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-neon-blue/25 bg-[#05060f] light:bg-white py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.55),0_0_0_1px_rgba(56,189,248,0.08)] light:shadow-xl"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[var(--text-muted)]">No matches</li>
          ) : (
            results.map((entry, i) => (
              <li key={entry.href} id={`${listId}-${i}`} role="option" aria-selected={i === highlightedIndex}>
                <Link
                  href={entry.href}
                  onClick={(e) => go(e, entry.href)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={`block px-3 py-2 text-xs transition-colors ${
                    i === highlightedIndex
                      ? "bg-neon-blue/15 text-neon-blue"
                      : "text-[var(--text-secondary)] hover:bg-neon-blue/10 hover:text-neon-blue"
                  }`}
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
