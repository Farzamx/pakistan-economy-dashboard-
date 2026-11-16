// The top of the Overview: page header, Macro Intelligence card, key-figure tiles and the secondary figures strip.
// Server-compatible (no hooks). Presentation only: every figure is passed in by the page from data it already fetched.

import Link from "next/link";
import type { MacroSummary } from "./macroSummary";
import Sparkline from "./Sparkline";
import { ChangeValue, StatusPill, type StatusTone } from "./valueDisplay";

export const CARD = "rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface";
const EMPTY = "px-5 py-6 text-[13px] text-pe-text-3";

// ── 1. Header ────────────────────────────────────────────────────────────────

export function OverviewHeader({ dateLine, dueToday }: { dateLine: string; dueToday: string[] }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-pe-text-3">{dateLine}</p>
        <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.01em] text-pe-text lg:text-[30px]">Pakistan&rsquo;s economy at a glance</h1>
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
        {dueToday.length > 0 && (
          <Link
            href="/economic-calendar"
            className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--pe-radius)] border border-pe-border-strong bg-pe-surface-2 px-4 text-[13px] font-medium text-pe-accent hover:underline lg:min-h-9 lg:rounded-full"
          >
            <span>Due today: {dueToday.join(" · ")}</span>
            <span aria-hidden="true" className="lg:hidden">→</span>
          </Link>
        )}
        <Link href="/economic-calendar" className="hidden min-h-9 items-center whitespace-nowrap text-[13px] font-medium text-pe-accent hover:underline lg:inline-flex">
          Full calendar →
        </Link>
      </div>
    </header>
  );
}

// ── 2a. Macro Intelligence card ──────────────────────────────────────────────

export function MacroSummaryCard({ id, summary }: { id: string; summary: MacroSummary | null }) {
  return (
    <section aria-labelledby={`${id}-heading`} id={id} className={`${CARD} flex h-full flex-col p-5 lg:p-6`}>
      <div className="flex items-baseline justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-pe-text-3">
        <h2 id={`${id}-heading`} className="font-medium">Macro intelligence</h2>
        {summary && (
          <span>
            {summary.ratedCount} of {summary.totalCount} <span className="max-sm:hidden">dimensions </span>rated
          </span>
        )}
      </div>

      {!summary ? (
        <p className="mt-4 text-[13px] text-pe-text-3">The macro intelligence summary is unavailable right now. The figures below are unaffected.</p>
      ) : (
        <>
          <p className="mt-4 text-[20px] font-semibold leading-snug text-pe-text lg:text-[22px]">{summary.headline}</p>
          {summary.sentences.length > 0 && <p className="mt-2 text-[14px] leading-relaxed text-pe-text-2">{summary.sentences.join(" ")}</p>}

          {/* With nothing rated, the headline already says so and the "Not rated" line below names every dimension: no third sentence. */}
          {summary.rows.length > 0 && (
            <ul className="mt-4 border-t border-pe-border">
              {summary.rows.map((row) => (
                <li key={row.id} className="flex items-baseline justify-between gap-3 border-b border-pe-border py-2.5 text-[14px]">
                  <span className="shrink-0 font-medium text-pe-text">{row.label}</span>
                  <span className="hidden min-w-0 flex-1 text-end text-[13px] text-pe-text-3 sm:block">
                    {row.input}
                    {row.caution && <span className="text-[var(--pe-warn-text)]">{row.input ? " · " : ""}{row.caution}</span>}
                  </span>
                  {row.caution && <span className="min-w-0 flex-1 text-[12px] text-[var(--pe-warn-text)] sm:hidden">· {row.caution}</span>}
                  <span className="flex w-[9.5rem] shrink-0 items-baseline justify-end gap-1.5 font-medium text-pe-text">
                    <span aria-hidden="true" className="text-[11px] text-pe-text-2">{row.glyph}</span>
                    {row.state}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {summary.unrated.length > 0 && (
            <p className="mt-3 text-[12px] leading-relaxed text-pe-text-3">Not rated: {summary.unrated.join(", ")}. Not enough recent data.</p>
          )}
        </>
      )}

      <div className="mt-auto pt-4">
        <Link
          href="/macro-intelligence"
          className="flex min-h-11 items-center justify-center rounded-[var(--pe-radius)] border border-pe-border text-[14px] font-medium text-pe-accent hover:bg-pe-surface-2 lg:inline-flex lg:min-h-0 lg:justify-start lg:border-0 lg:hover:bg-transparent lg:hover:underline"
        >
          Open Macro Intelligence →
        </Link>
      </div>
    </section>
  );
}

// ── 2b. Key-figure tiles ─────────────────────────────────────────────────────

export interface KeyFigure {
  id: string;
  label: string;
  value: string;
  unit: string;
  change?: string | null;
  /** Observation period, already formatted. */
  period: string;
  source: string;
  /** A second mono line, e.g. "trend: SBP monthly average". */
  footnote?: string;
  sparkline: number[];
  /** Existing indicator page; empty when there is none. */
  href: string;
  /** Shown only when the figure is not current. */
  status?: { tone: StatusTone; label: string };
}

export function KeyFigureTiles({ tiles }: { tiles: KeyFigure[] }) {
  if (tiles.length === 0) {
    return <div className={`${CARD} ${EMPTY}`}>Key figures are unavailable right now.</div>;
  }
  return (
    <ul className="grid h-full grid-cols-2 gap-3 lg:grid-rows-2 lg:gap-4">
      {tiles.map((tile) => {
        const body = (
          <>
            <span className="flex items-start justify-between gap-2">
              <span className="text-[13px] text-pe-text-2">{tile.label}</span>
              {tile.status && tile.status.tone !== "current" && <StatusPill tone={tile.status.tone} label={tile.status.label} />}
            </span>
            <span className="mt-2 flex items-end justify-between gap-3">
              <span className="whitespace-nowrap">
                <span className="text-[30px] font-semibold leading-none tabular-nums text-pe-text lg:text-[34px]">{tile.value}</span>
                {tile.unit && <span className="ms-1 text-[13px] text-pe-text-2">{tile.unit}</span>}
              </span>
            </span>
            <ChangeValue change={tile.change} className="mt-2 text-[13px]" />
            <span className="mt-3 block min-h-8 flex-1 max-lg:hidden">
              <Sparkline values={tile.sparkline} label={`${tile.label}: last ${tile.sparkline.length} observations`} />
            </span>
            <span className="mt-3 block font-mono text-[11px] leading-relaxed text-pe-text-3">
              {tile.period} · {tile.source}
              {tile.footnote && <span className="block">{tile.footnote}</span>}
            </span>
          </>
        );
        return (
          <li key={tile.id} className={`${CARD} min-w-0`}>
            {tile.href ? (
              <Link href={tile.href} className="flex h-full flex-col p-4 hover:bg-pe-surface-2 lg:p-5">{body}</Link>
            ) : (
              <div className="flex h-full flex-col p-4 lg:p-5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── 3. Secondary figures strip ───────────────────────────────────────────────

export interface SecondaryFigure {
  id: string;
  label: string;
  value: string;
  unit: string;
  change?: string | null;
  /** Plain note under the value: a period, or "Policy rate minus CPI". */
  note?: string;
  /** When set, `note` is a status line and takes that status colour. */
  noteTone?: "warn" | "due";
  href?: string;
}

const NOTE_CLASS = { warn: "text-[var(--pe-warn-text)]", due: "text-pe-accent" } as const;

export function SecondaryStrip({ cells }: { cells: SecondaryFigure[] }) {
  if (cells.length === 0) return null;
  return (
    <ul aria-label="More figures" className={`${CARD} grid grid-cols-1 divide-y divide-pe-border lg:grid-cols-6 lg:divide-x lg:divide-y-0`}>
      {cells.map((cell) => {
        const note = (
          <span className={`text-[12px] ${cell.noteTone ? NOTE_CLASS[cell.noteTone] : "text-pe-text-3"}`}>
            {cell.change && !cell.noteTone && <ChangeValue change={cell.change} className="text-[12px]" />}
            {cell.change && !cell.noteTone && cell.note ? " · " : ""}
            {cell.note}
          </span>
        );
        const body = (
          <>
            <span className="flex min-w-0 flex-col gap-0.5 lg:contents">
              <span className="text-[14px] font-medium text-pe-text lg:text-[12px] lg:font-normal lg:text-pe-text-2">{cell.label}</span>
              <span className="lg:order-3">{note}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-end lg:order-2 lg:mt-1 lg:text-start">
              <span className="text-[18px] font-semibold tabular-nums text-pe-text lg:text-[22px]">{cell.value}</span>
              {cell.unit && <span className="ms-1 text-[12px] font-medium text-pe-text-2">{cell.unit}</span>}
            </span>
          </>
        );
        const cls = "flex min-h-11 items-center justify-between gap-4 px-4 py-3 lg:h-full lg:flex-col lg:items-start lg:justify-start lg:gap-1 lg:px-5 lg:py-4";
        return (
          <li key={cell.id} className="min-w-0">
            {cell.href ? <Link href={cell.href} className={`${cls} hover:bg-pe-surface-2`}>{body}</Link> : <div className={cls}>{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

// ── Markets strip (kept slim: five instruments) ──────────────────────────────

export interface MarketCell {
  label: string;
  value: string;
  unit: string;
  change?: string | null;
  period: string;
  href?: string;
}

export function MarketsStrip({ id, cells, allHref }: { id: string; cells: MarketCell[]; allHref: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={CARD}>
      <div className="flex items-center justify-between gap-3 border-b border-pe-border px-4 py-2.5 lg:px-5">
        <h2 id={`${id}-heading`} className="text-[15px] font-semibold text-pe-text">Markets</h2>
        <Link href={allHref} className="-my-2 inline-flex min-h-11 items-center text-[13px] font-medium text-pe-accent hover:underline">All markets →</Link>
      </div>
      {cells.length === 0 ? (
        <p className={EMPTY}>Market data is unavailable right now.</p>
      ) : (
        <ul className="grid grid-cols-1 divide-y divide-pe-border lg:grid-cols-5 lg:divide-x lg:divide-y-0">
          {cells.map((cell) => {
            const body = (
              <>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-pe-text lg:text-[12px] lg:font-normal lg:text-pe-text-2">{cell.label}</span>
                  <span className="font-mono text-[11px] text-pe-text-3">{cell.period}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 lg:items-start">
                  <span className="whitespace-nowrap">
                    <span className="text-[16px] font-semibold tabular-nums text-pe-text lg:text-[18px]">{cell.value}</span>
                    {cell.unit && <span className="ms-1 text-[12px] text-pe-text-2">{cell.unit}</span>}
                  </span>
                  <ChangeValue change={cell.change} className="text-[12px]" />
                </span>
              </>
            );
            const cls = "flex min-h-11 items-center justify-between gap-4 px-4 py-2.5 lg:h-full lg:flex-col lg:items-start lg:justify-start lg:gap-1.5 lg:px-5 lg:py-3.5";
            return (
              <li key={cell.label} className="min-w-0">
                {cell.href ? <Link href={cell.href} className={`${cls} hover:bg-pe-surface-2`}>{body}</Link> : <div className={cls}>{body}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
