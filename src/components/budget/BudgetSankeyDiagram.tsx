"use client";

import { useMemo, useRef, useState } from "react";
import BudgetSankeySvg, { type SankeyHover } from "./BudgetSankeySvg";
import BudgetSankeyStageList from "./BudgetSankeyStageList";
import {
  IDS,
  NODE_COLORS,
  filterGraphByExpansion,
  getConnections,
  getExpandableParents,
  getFlowTableRows,
  getNodeDetail,
  getStageGroups,
  getTransparencySummary,
  layoutSankey,
  summarizeReconciliation,
  type NodeDetail,
  type PreparedSankeyYear,
  type SankeyGraph,
} from "@/lib/budget/budgetSankey";
import { formatBn, formatNumber, formatShare, formatSigned } from "@/lib/budget/sankeyFormat";

interface BudgetSankeyDiagramProps {
  /** Every year with verified flow detail, newest first (failed years included so the page can say why they are not drawn). */
  years: PreparedSankeyYear[];
  /** First and last fiscal year of the Budget Tracker's historical charts, so the page can contrast them with this diagram's years. */
  historicalCoverage: { first: string; last: string };
}

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six"];

const LEGEND: { label: string; color: string; hatched?: boolean; note: string }[] = [
  { label: "Revenue", color: NODE_COLORS.revenue, note: "taxes and non-tax receipts" },
  { label: "Borrowing and financing", color: NODE_COLORS.financing, hatched: true, note: "not revenue" },
  { label: "Provincial share", color: NODE_COLORS.provincial, note: "NFC award" },
  { label: "Federal spending", color: NODE_COLORS.interest, note: "each line keeps its colour from the allocation chart" },
  { label: "Development", color: NODE_COLORS.psdp, note: "PSDP and net lending" },
];

function Swatch({ color, hatched }: { color: string; hatched?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3 w-3 shrink-0 rounded-sm"
      style={hatched ? { background: `repeating-linear-gradient(45deg, ${color} 0 2px, rgba(255,255,255,0.6) 2px 4px)` } : { background: color }}
    />
  );
}

function NoData({ years }: { years: PreparedSankeyYear[] }) {
  const failed = years.find((y) => !y.diagnostics.ok);
  const checks = failed?.diagnostics.reconciliation.filter((r) => !r.ok) ?? [];
  const errors = failed?.diagnostics.issues.filter((i) => i.severity === "error") ?? [];
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-200 light:text-amber-900" role="status" data-testid="budget-sankey-nodata">
      <p className="font-semibold">The budget flow diagram is not shown.</p>
      <p className="mt-1 text-[13px] leading-relaxed">
        {years.length === 0
          ? "No fiscal year has verified revenue, financing and expenditure detail yet, and the diagram only draws figures that reconcile to the Budget in Brief."
          : `The figures for FY${failed?.fiscalYear} did not pass the reconciliation checks, so the diagram is withheld rather than drawn from numbers that do not add up.`}
      </p>
      {(checks.length > 0 || errors.length > 0) && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12px]">
          {checks.map((c) => (
            <li key={c.id}>
              {c.description}: printed {formatNumber(c.printed, 3)}, parts add to {formatNumber(c.computed, 3)} (difference {formatSigned(c.difference)}, allowed {c.tolerance}).
            </li>
          ))}
          {errors.map((e, i) => (
            <li key={i}>{e.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DetailPanel({ detail, expandable, expanded, onToggleExpand, onClear }: { detail: NodeDetail | null; expandable: boolean; expanded: boolean; onToggleExpand: () => void; onClear: () => void }) {
  if (!detail) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-[13px] text-[var(--text-muted)]" data-testid="budget-sankey-detail-empty">
        Select any block to see its amount, its share of the budget, where the money comes from and where it goes, and which Budget in Brief table it was read from.
      </div>
    );
  }
  const n = detail.node;
  const color = NODE_COLORS[n.colorKey] ?? "#64748b";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" data-testid="budget-sankey-detail" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Swatch color={color} hatched={n.kind === "financing"} />
          <h4 className="text-base font-semibold text-[var(--text-primary)]">{n.label}</h4>
          {n.derived && <span className="rounded border border-[var(--border)] px-1.5 text-[10px] text-[var(--text-muted)]">remainder</span>}
          {n.kind === "financing" && <span className="rounded border border-[var(--border)] px-1.5 text-[10px] text-[var(--text-muted)]">borrowing, not revenue</span>}
        </div>
        <div className="flex gap-2">
          {expandable && (
            <button type="button" onClick={onToggleExpand} aria-expanded={expanded} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
              {expanded ? "Hide breakdown" : "Show breakdown"}
            </button>
          )}
          <button type="button" onClick={onClear} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
            Clear
          </button>
        </div>
      </div>

      <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{formatBn(detail.value)}</p>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-3">
        {detail.parent && detail.parent.id !== IDS.total && (
          <div>
            <dt className="text-[var(--text-muted)]">Share of {detail.parent.label}</dt>
            <dd className="font-semibold tabular-nums text-[var(--text-primary)]">{formatShare(detail.parent.pct)}</dd>
          </div>
        )}
        <div>
          <dt className="text-[var(--text-muted)]">Share of total resources</dt>
          <dd className="font-semibold tabular-nums text-[var(--text-primary)]">{formatShare(detail.pctOfTotalResources)}</dd>
        </div>
        {detail.pctOfOutlay !== null && (
          <div>
            <dt className="text-[var(--text-muted)]">Share of total expenditure</dt>
            <dd className="font-semibold tabular-nums text-[var(--text-primary)]">{formatShare(detail.pctOfOutlay)}</dd>
          </div>
        )}
      </dl>

      <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">{n.description}</p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Comes from</p>
          {detail.incoming.length === 0 ? (
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">A starting point of the diagram.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-[12px]">
              {detail.incoming.map((e) => (
                <li key={e.nodeId} className="flex justify-between gap-3 tabular-nums">
                  <span className="text-[var(--text-secondary)]">{e.label}</span>
                  <span className="text-[var(--text-primary)]">{formatBn(e.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Goes to</p>
          {detail.outgoing.length === 0 ? (
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">An end point: money is spent here.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-[12px]">
              {detail.outgoing.map((e) => (
                <li key={e.nodeId} className="flex justify-between gap-3 tabular-nums">
                  <span className="text-[var(--text-secondary)]">{e.label}</span>
                  <span className="text-[var(--text-primary)]">
                    {formatBn(e.value)} · {formatShare(e.pctOfNode)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {n.composition && n.composition.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Made up of (as printed)</p>
          <ul className="mt-1 space-y-0.5 text-[12px]">
            {n.composition.map((c) => (
              <li key={c.label} className="flex justify-between gap-3 tabular-nums">
                <span className="text-[var(--text-secondary)]">
                  {c.label}
                  {c.note ? ` (${c.note})` : ""}
                </span>
                <span className="text-[var(--text-primary)]">{c.value < 0 ? `−${formatBn(Math.abs(c.value))}` : formatBn(c.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {n.notes?.map((note) => (
        <p key={note} className="mt-2 rounded-lg border border-[var(--border-subtle)] p-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
          {note}
        </p>
      ))}
      <p className="mt-3 text-[11px] text-[var(--text-muted)]">Source: {n.source}</p>
    </div>
  );
}

function Fact({ title, children, wide, tone }: { title: string; children: React.ReactNode; wide?: boolean; tone?: "amber" }) {
  return (
    <div className={`rounded-lg p-2.5 ${wide ? "sm:col-span-2 lg:col-span-3" : ""} ${tone === "amber" ? "border border-amber-500/40 bg-amber-500/[0.08]" : "border border-[var(--border-subtle)]"}`}>
      <dt className={`text-[11px] font-semibold uppercase tracking-widest ${tone === "amber" ? "text-amber-300 light:text-amber-800" : "text-[var(--text-muted)]"}`}>{title}</dt>
      <dd className="mt-1 leading-relaxed text-[var(--text-secondary)]">{children}</dd>
    </div>
  );
}

export default function BudgetSankeyDiagram({ years, historicalCoverage }: BudgetSankeyDiagramProps) {
  const usable = useMemo(() => years.filter((y) => y.diagnostics.ok), [years]);
  const [fyChoice, setFyChoice] = useState<string>(usable[0]?.fiscalYear ?? "");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(usable[0] ? getExpandableParents(usable[0].graph) : []));
  const [selectedRaw, setSelectedRaw] = useState<string | null>(null);
  const [hover, setHover] = useState<(SankeyHover & { left: number; top: number }) | null>(null);
  const [mobileDiagramOpen, setMobileDiagramOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const year = usable.find((y) => y.fiscalYear === fyChoice) ?? usable[0] ?? null;
  const baseGraph: SankeyGraph | null = year?.graph ?? null;
  const visible = useMemo(() => (baseGraph ? filterGraphByExpansion(baseGraph, expanded) : null), [baseGraph, expanded]);
  const layout = useMemo(() => (visible ? layoutSankey(visible) : null), [visible]);
  const expandable = useMemo(() => new Set(baseGraph ? getExpandableParents(baseGraph) : []), [baseGraph]);
  const selectedId = selectedRaw && visible?.nodes.some((n) => n.id === selectedRaw) ? selectedRaw : null;
  const detail = visible && selectedId ? getNodeDetail(visible, selectedId) : null;
  const connected = visible && selectedId ? getConnections(visible, selectedId) : null;
  const totalResources = visible ? (getNodeDetail(visible, IDS.total)?.value ?? 0) : 0;
  const groups = useMemo(() => (visible ? getStageGroups(visible) : []), [visible]);
  const tableRows = useMemo(() => (baseGraph ? getFlowTableRows(baseGraph) : []), [baseGraph]);

  // the tooltip's position is worked out here, in the event handler, because a ref must not be read while rendering
  const handleHover = (h: SankeyHover | null) => {
    if (!h) {
      setHover(null);
      return;
    }
    const rect = frameRef.current?.getBoundingClientRect();
    const left = Math.min(Math.max(h.clientX - (rect?.left ?? 0) + 14, 8), Math.max((rect?.width ?? 0) - 250, 8));
    const top = Math.max(h.clientY - (rect?.top ?? 0) + 14, 8);
    setHover({ ...h, left, top });
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // tooltip content comes from the same pure helpers as the detail panel
  let tooltip: { title: string; lines: string[]; left: number; top: number } | null = null;
  if (hover && visible) {
    const { left, top } = hover;
    if (hover.kind === "node") {
      const d = getNodeDetail(visible, hover.id);
      if (d) tooltip = { title: d.node.label, lines: [formatBn(d.value), `${formatShare(d.pctOfTotalResources)} of total resources`, ...(d.pctOfOutlay !== null ? [`${formatShare(d.pctOfOutlay)} of total expenditure`] : []), "Click to inspect"], left, top };
    } else {
      const l = visible.links.find((x) => x.id === hover.id);
      if (l) {
        const s = getNodeDetail(visible, l.source);
        const t = getNodeDetail(visible, l.target);
        if (s && t) tooltip = { title: `${s.node.label} → ${t.node.label}`, lines: [formatBn(l.value), `${formatShare((l.value / s.value) * 100)} of ${s.node.label}`, `${formatShare((l.value / totalResources) * 100)} of total resources`], left, top };
      }
    }
  }

  const reconciliation = year?.diagnostics.reconciliation ?? [];
  const passing = reconciliation.filter((r) => r.ok).length;
  const recon = summarizeReconciliation(reconciliation);
  const transparency = baseGraph ? getTransparencySummary(baseGraph) : { derived: [], grouped: [] };
  const detailedYears = usable.map((y) => `FY${y.fiscalYear}`).reverse();
  const yearCountWord = COUNT_WORDS[usable.length] ?? String(usable.length);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="sankey-h" id="budget-flow" data-testid="budget-sankey">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="sankey-h" className="text-lg font-semibold text-[var(--text-primary)]">
            Where Does Pakistan&apos;s Budget Money Go?
          </h2>
          <p className="text-sm text-[var(--text-muted)]">Follow government revenue, borrowing and federal expenditure through Pakistan&apos;s budget.</p>
        </div>
        {usable.length > 1 && (
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1" role="group" aria-label="Fiscal year of the flow diagram">
            {usable.map((y) => (
              <button
                key={y.fiscalYear}
                type="button"
                aria-pressed={year?.fiscalYear === y.fiscalYear}
                onClick={() => setFyChoice(y.fiscalYear)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${year?.fiscalYear === y.fiscalYear ? "bg-neon-blue/15 text-neon-blue" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"}`}
              >
                FY{y.fiscalYear}
              </button>
            ))}
          </div>
        )}
      </div>

      {!year || !visible || !layout ? (
        <div className="glass-card rounded-2xl p-5">
          <NoData years={years} />
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          {/* attribution, always visible */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
            <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">FY{year.fiscalYear} · Budget Estimates</span>
            <span className="rounded border border-amber-500/40 bg-amber-500/[0.08] px-1.5 py-0.5 font-semibold text-amber-300 light:text-amber-800">Plans, not actual spending</span>
            <span>PKR billion (Rs bn)</span>
            <span>
              Source:{" "}
              {year.sourceUrl ? (
                <a href={year.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-neon-blue underline-offset-2 hover:underline">
                  {year.sourceDocument}
                </a>
              ) : (
                year.sourceDocument
              )}
              , Finance Division, Government of Pakistan ({year.sourceTables.map((t) => t.replace(/^Table (\d+).*$/, "Table $1")).filter((t, i, a) => a.indexOf(t) === i && /^Table/.test(t)).join(", ")} and the defence function table)
            </span>
          </div>

          {/* what you are looking at */}
          <dl className="mb-3 grid gap-2 text-[12px] sm:grid-cols-2 lg:grid-cols-3" data-testid="budget-sankey-transparency">
            <Fact title="Estimates, not actual spending" tone="amber" wide>
              Every figure is a <strong className="font-semibold text-[var(--text-primary)]">Budget Estimate</strong>: the plan approved at the start of the fiscal year. It is not what was actually spent. Actual expenditure usually differs, and actuals are not shown in this diagram or anywhere in this workshop.
            </Fact>
            <Fact title="Coverage">
              This diagram: <strong className="font-semibold text-[var(--text-primary)]">{detailedYears.join(" and ")}</strong> ({yearCountWord} fiscal {usable.length === 1 ? "year" : "years"} with detailed flows). The Budget Tracker&apos;s historical charts below cover FY{historicalCoverage.first} to FY{historicalCoverage.last}.
            </Fact>
            <Fact title="Currency and basis">PKR billion (Rs bn), nominal: each year&apos;s own prices, not adjusted for inflation.</Fact>
            <Fact title="Revenue and borrowing are separate">Taxes and non-tax receipts are revenue. Borrowing and privatisation proceeds are financing, shown hatched, and are never counted as revenue.</Fact>
            {transparency.derived.length > 0 && (
              <Fact title="Derived remainders (*)">
                {transparency.derived.map((d) => d.label).join("; ")}. Each is a printed total minus the printed items drawn beside it, not a printed figure.
              </Fact>
            )}
            {transparency.grouped.length > 0 && (
              <Fact title="Grouped for legibility">
                {transparency.grouped.map((g) => g.label).join("; ")}. The source prints these items separately; they are combined so small items stay readable. Each part is listed in the block&apos;s details.
              </Fact>
            )}
            <Fact title="Not available from the source">The provincial share is not split by province: the Budget in Brief does not print that split.</Fact>
          </dl>

          {/* legend */}
          <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-secondary)]" aria-label="Legend" data-testid="budget-sankey-legend">
            {LEGEND.map((l) => (
              <li key={l.label} className="flex items-center gap-1.5">
                <Swatch color={l.color} hatched={l.hatched} />
                <span>
                  <span className="font-medium text-[var(--text-primary)]">{l.label}</span> <span className="text-[var(--text-muted)]">· {l.note}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setExpanded(new Set(expandable))} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
              Show all breakdowns
            </button>
            <button type="button" onClick={() => setExpanded(new Set())} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
              Overview only
            </button>
            <span className="text-[11px] text-[var(--text-muted)]">Revised estimates and actuals are not offered: only the Budget Estimate is available for every flow.</span>
          </div>

          {/* desktop and tablet: the diagram */}
          <div className="relative hidden md:block" ref={frameRef}>
            <div className="overflow-x-auto" data-testid="budget-sankey-scroll">
              <BudgetSankeySvg layout={layout} graph={visible} selectedId={selectedId} hover={hover} totalResources={totalResources} fiscalYear={year.fiscalYear} onSelect={setSelectedRaw} onHover={handleHover} />
            </div>
            {tooltip && (
              <div role="tooltip" className="pointer-events-none absolute z-20 w-[236px] rounded-xl border border-[var(--border)] px-3 py-2 text-[12px] shadow-xl backdrop-blur-xl" style={{ left: tooltip.left, top: tooltip.top, backgroundColor: "var(--space-700)" }} data-testid="budget-sankey-tooltip">
                <p className="font-semibold text-[var(--text-primary)]">{tooltip.title}</p>
                {tooltip.lines.map((line, i) => (
                  <p key={i} className={i === 0 ? "text-base font-semibold tabular-nums text-[var(--text-primary)]" : "text-[11px] tabular-nums text-[var(--text-secondary)]"}>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
          <p className="mt-1 hidden text-[11px] text-[var(--text-muted)] md:block xl:hidden">On narrower screens, scroll sideways to see every stage.</p>

          {/* phone: the same data, stage by stage */}
          <div className="md:hidden">
            <BudgetSankeyStageList groups={groups} selectedId={selectedId} connectedIds={connected?.nodeIds ?? null} expandable={expandable} expanded={expanded} onSelect={setSelectedRaw} onToggleExpand={toggleExpand} />
            <button
              type="button"
              aria-expanded={mobileDiagramOpen}
              onClick={() => setMobileDiagramOpen((v) => !v)}
              className="mt-3 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              {mobileDiagramOpen ? "Hide the full diagram" : "Open the full diagram (scroll sideways)"}
            </button>
            {mobileDiagramOpen && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                <BudgetSankeySvg layout={layout} graph={visible} selectedId={selectedId} hover={null} totalResources={totalResources} fiscalYear={year.fiscalYear} onSelect={setSelectedRaw} onHover={() => undefined} />
              </div>
            )}
          </div>

          <div className="mt-4">
            <DetailPanel detail={detail} expandable={!!selectedId && expandable.has(selectedId)} expanded={!!selectedId && expanded.has(selectedId)} onToggleExpand={() => selectedId && toggleExpand(selectedId)} onClear={() => setSelectedRaw(null)} />
          </div>

          <ul className="mt-4 flex flex-col gap-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
            <li>
              <span className="font-semibold text-[var(--text-secondary)]">Borrowing is financing, not revenue.</span> Gross federal revenue and borrowing are separate blocks. Borrowing and external loans are shown net of repayments, as Budget in Brief reports them.
            </li>
            <li>Money is fungible: every source flows into one pool and every use is paid from it, so the diagram does not say that a particular tax or loan pays for a particular item.</li>
            <li>The provinces&apos; NFC share is part of gross revenue and is deducted before federal spending, so total resources are larger than total federal expenditure by exactly that share.</li>
            <li>Ribbon width is proportional to the amount on one scale for the whole diagram. A block marked * is a remainder: the printed total minus the printed items drawn beside it. Very small flows are hairlines; hover them or use the table.</li>
            {year.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>

          <div className="mt-4 rounded-xl border border-[var(--border-subtle)] p-3 text-[12px] leading-relaxed text-[var(--text-secondary)]" data-testid="budget-sankey-recon-summary">
            <p>
              <span className="font-semibold text-[var(--text-primary)]">
                Reconciliation, FY{year.fiscalYear}: {recon.passing} of {recon.total} checks pass.
              </span>{" "}
              {recon.withDifference > 0
                ? `${recon.withDifference} show a small difference inside the allowed tolerance${recon.largest ? `; the largest is Rs ${Math.abs(recon.largest.difference).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}bn (${recon.largest.description.toLowerCase()})` : ""}. `
                : "Every difference is zero. "}
              No figure was adjusted to make a total match; every difference is listed in the tables below.
            </p>
            {recon.sourceGaps.map((g) => (
              <p key={g.id} className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.08] p-2 text-amber-200 light:text-amber-900" data-testid="budget-sankey-source-gap">
                <span className="font-semibold">A gap inside the source document.</span> {g.note}
              </p>
            ))}
          </div>

          <details className="mt-4 text-[12px] text-[var(--text-muted)]" data-testid="budget-sankey-tables">
            <summary className="cursor-pointer select-none text-[var(--text-secondary)] hover:text-[var(--text-primary)]">View the flows and the reconciliation as tables</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left tabular-nums">
                <caption className="pb-2 text-left text-[11px] text-[var(--text-muted)]">
                  Every flow in the FY{year.fiscalYear} diagram (Budget Estimates, Rs billion). Shares are of the block the flow leaves and of total resources.
                </caption>
                <thead>
                  <tr className="text-[var(--text-secondary)]">
                    <th scope="col" className="py-1 pr-3 font-medium">From</th>
                    <th scope="col" className="px-2 py-1 font-medium">To</th>
                    <th scope="col" className="px-2 py-1 text-right font-medium">Rs bn</th>
                    <th scope="col" className="px-2 py-1 text-right font-medium">% of source</th>
                    <th scope="col" className="px-2 py-1 text-right font-medium">% of total resources</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--border-subtle)]">
                      <th scope="row" className="py-1 pr-3 text-left font-normal">{r.from}</th>
                      <td className="px-2 py-1">{r.to}</td>
                      <td className="px-2 py-1 text-right">{formatNumber(r.value, 3)}</td>
                      <td className="px-2 py-1 text-right">{formatShare(r.pctOfSource)}</td>
                      <td className="px-2 py-1 text-right">{formatShare(r.pctOfTotalResources)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left tabular-nums" data-testid="budget-sankey-reconciliation">
                <caption className="pb-2 text-left text-[11px] text-[var(--text-muted)]">
                  Reconciliation: {passing} of {reconciliation.length} checks pass. Each compares the sum of the parts with the total the document prints. Allowed differences: 0.5 for each whole-billion figure in an identity (Tables 1 and 2 print whole billions), 0.01 for Rs-million tables, 0.5 for the Table 10 total (several of its rows are printed rounded) and 4 for the pool (seven whole-billion figures plus that rounding). Differences inside tolerance are shown, not hidden.
                </caption>
                <thead>
                  <tr className="text-[var(--text-secondary)]">
                    <th scope="col" className="py-1 pr-3 font-medium">Check</th>
                    <th scope="col" className="px-2 py-1 font-medium">Table</th>
                    <th scope="col" className="px-2 py-1 text-right font-medium">Printed</th>
                    <th scope="col" className="px-2 py-1 text-right font-medium">Parts add to</th>
                    <th scope="col" className="px-2 py-1 text-right font-medium">Difference</th>
                    <th scope="col" className="px-2 py-1 text-right font-medium">Allowed</th>
                    <th scope="col" className="px-2 py-1 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--border-subtle)] align-top">
                      <th scope="row" className="py-1 pr-3 text-left font-normal">
                        {r.description}
                        {r.sourceGap && <span className="ml-2 rounded border border-amber-500/40 px-1 text-[10px] text-amber-300 light:text-amber-800">gap in the source</span>}
                        {r.note && <span className="mt-1 block text-[11px] leading-relaxed text-[var(--text-muted)]">{r.note}</span>}
                      </th>
                      <td className="px-2 py-1">{r.source}</td>
                      <td className="px-2 py-1 text-right">{formatNumber(r.printed, 3)}</td>
                      <td className="px-2 py-1 text-right">{formatNumber(r.computed, 3)}</td>
                      <td className="px-2 py-1 text-right">{formatSigned(r.difference)}</td>
                      <td className="px-2 py-1 text-right">{`±${r.tolerance}`}</td>
                      <td className="px-2 py-1">{r.ok ? "Within tolerance" : "Does not reconcile"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
