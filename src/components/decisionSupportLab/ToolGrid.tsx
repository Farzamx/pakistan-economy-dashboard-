"use client";

// Section C3/C4: a sticky search+filter toolbar above the tool grid, a
// "Start Here" row (tools the user's current profile can already support)
// and a "Recently used" row (once at least one tool has been visited),
// then the existing per-category sections — or, while searching, a single
// flat filtered results grid instead.
import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "@/components/T";
import { useLanguage } from "@/components/LanguageProvider";
import ToolCard from "@/components/decisionSupportLab/ToolCard";
import { DECISION_SUPPORT_TOOLS, TOOL_CATEGORIES, getStartHereTools, type ToolDefinition } from "@/lib/decisionSupportLab/tools";
import { useEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import { useRecentToolIds } from "@/lib/decisionSupportLab/recentTools";

interface Props {
  isAuthenticated: boolean;
}

function focusAdjacentToolCard(current: HTMLElement, direction: 1 | -1) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-tool-card]"));
  const index = cards.indexOf(current);
  if (index === -1) return;
  const next = cards[index + direction];
  next?.focus();
}

export default function ToolGrid({ isAuthenticated }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();
  const [query, setQuery] = useState("");
  const recentIds = useRecentToolIds();
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const active = document.activeElement;
      const isTyping = active instanceof HTMLElement && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (isTyping) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, []);

  function onResultsKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !active.hasAttribute("data-tool-card")) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      focusAdjacentToolCard(active, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      focusAdjacentToolCard(active, -1);
    }
  }

  const startHereTools = useMemo(() => getStartHereTools(profile, 3), [profile]);
  const recentTools = useMemo(() => recentIds.map((id) => DECISION_SUPPORT_TOOLS.find((tool) => tool.id === id)).filter((tool): tool is ToolDefinition => Boolean(tool)), [recentIds]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return null;
    return DECISION_SUPPORT_TOOLS.filter((tool) => t(tool.titleKey).toLowerCase().includes(q) || t(tool.descriptionKey).toLowerCase().includes(q));
  }, [query, t]);

  function scrollToCategory(id: string) {
    document.getElementById(`dsl-category-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="glass-card sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3">
        <div className="relative min-w-[200px] flex-1">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools… (press /)"
            aria-label="Search tools by name or description"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {TOOL_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => scrollToCategory(category.id)}
              className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-white/60 transition-colors hover:border-neon-blue/40 hover:text-neon-blue light:text-slate-500"
            >
              <T tKey={category.titleKey} />
            </button>
          ))}
        </div>
        <span className="text-xs text-white/40 light:text-slate-400">
          {searchResults ? `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}` : `${DECISION_SUPPORT_TOOLS.length} tools`}
        </span>
      </div>

      {searchResults ? (
        <div ref={resultsRef} onKeyDown={onResultsKeyDown} className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {searchResults.map((tool) => (
            <ToolCard key={tool.id} tool={tool} isAuthenticated={isAuthenticated} />
          ))}
          {searchResults.length === 0 && <p className="text-sm text-white/50 light:text-slate-500">No tools match &ldquo;{query}&rdquo;.</p>}
        </div>
      ) : (
        <div ref={resultsRef} onKeyDown={onResultsKeyDown} className="flex flex-col gap-8">
          {startHereTools.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50 light:text-slate-500">Start here</h2>
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                {startHereTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} isAuthenticated={isAuthenticated} />
                ))}
              </div>
            </section>
          )}

          {recentTools.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50 light:text-slate-500">Recently used</h2>
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                {recentTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} isAuthenticated={isAuthenticated} />
                ))}
              </div>
            </section>
          )}

          {TOOL_CATEGORIES.map((category) => {
            const tools = DECISION_SUPPORT_TOOLS.filter((tool) => tool.category === category.id);
            if (tools.length === 0) return null;
            const isFlagship = category.id === "financial-planning";
            return (
              <section
                key={category.id}
                id={`dsl-category-${category.id}`}
                className={isFlagship ? "rounded-2xl border border-neon-blue/25 bg-gradient-to-br from-neon-blue/[0.06] via-transparent to-transparent p-5 sm:p-6" : undefined}
              >
                {isFlagship && (
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-neon-blue/40 bg-neon-blue/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neon-blue">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-neon-blue" />
                    Flagship
                  </span>
                )}
                <h2 className="text-headline text-white light:text-slate-900">
                  <T tKey={category.titleKey} />
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-white/55 light:text-slate-500">
                  <T tKey={category.subtitleKey} />
                </p>

                <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                  {tools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} isAuthenticated={isAuthenticated} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
