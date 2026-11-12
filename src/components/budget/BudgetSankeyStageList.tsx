"use client";

import { NODE_COLORS, type SankeyStage, type StageGroup } from "@/lib/budget/budgetSankey";
import { formatBn, formatShare } from "@/lib/budget/sankeyFormat";

interface BudgetSankeyStageListProps {
  groups: StageGroup[];
  selectedId: string | null;
  /** Nodes joined to the selected node by a flow, highlighted so the connection survives without ribbons. */
  connectedIds: ReadonlySet<string> | null;
  expandable: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  onSelect: (id: string | null) => void;
  onToggleExpand: (id: string) => void;
}

const STAGE_HINT: Record<SankeyStage, string> = {
  0: "Where the money comes from",
  1: "Revenue and borrowing, kept apart",
  2: "Everything available to spend",
  3: "Who receives it",
  4: "Inside the larger lines",
};

/**
 * The phone layout of the Sankey: not the desktop diagram shrunk, but the same data read stage by stage. Each row is a node with its amount, its share
 * of total resources and a bar drawn to the same scale within its stage. Tapping a row selects it (the detail panel below shows where it comes from and
 * where it goes) and rows joined to it by a flow are marked, so the connection is readable without ribbons.
 */
export default function BudgetSankeyStageList({ groups, selectedId, connectedIds, expandable, expanded, onSelect, onToggleExpand }: BudgetSankeyStageListProps) {
  return (
    <ol className="flex flex-col gap-4" data-testid="budget-sankey-stages">
      {groups.map((g, gi) => {
        const max = Math.max(...g.nodes.map((n) => n.value), 1);
        return (
          <li key={g.stage} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                Stage {gi + 1} · {g.title}
              </h4>
              <span className="text-[10px] text-[var(--text-muted)]">{STAGE_HINT[g.stage]}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {g.nodes.map((n) => {
                const selected = selectedId === n.id;
                const linked = !selected && connectedIds?.has(n.id);
                const color = NODE_COLORS[n.colorKey] ?? "#64748b";
                return (
                  <li key={n.id}>
                    <div className={`rounded-lg border px-2.5 py-2 transition-colors ${selected ? "border-[var(--text-primary)] bg-[var(--surface-hover)]" : linked ? "border-neon-blue/50 bg-neon-blue/[0.06]" : "border-transparent"}`}>
                      <button type="button" aria-pressed={selected} onClick={() => onSelect(selected ? null : n.id)} className="block w-full text-left">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2 text-[13px] text-[var(--text-primary)]">
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={n.kind === "financing" ? { background: `repeating-linear-gradient(45deg, ${color} 0 2px, rgba(255,255,255,0.6) 2px 4px)` } : { background: color }}
                            />
                            <span className="min-w-0 break-words">
                              {n.label}
                              {n.derived ? " *" : ""}
                            </span>
                            {n.kind === "financing" && <span className="shrink-0 rounded border border-[var(--border)] px-1 text-[10px] text-[var(--text-muted)]">borrowing</span>}
                            {linked && <span className="shrink-0 text-[10px] text-neon-blue">linked</span>}
                          </span>
                          <span className="shrink-0 text-right text-[12px] tabular-nums text-[var(--text-secondary)]">
                            <span className="font-semibold text-[var(--text-primary)]">{formatBn(n.value)}</span> · {formatShare(n.pctOfTotalResources)}
                          </span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]" aria-hidden="true">
                          <span className="block h-full rounded-full" style={{ width: `${Math.max((n.value / max) * 100, 0.6)}%`, background: color, opacity: n.kind === "financing" ? 0.7 : 1 }} />
                        </span>
                      </button>
                      {expandable.has(n.id) && (
                        <button
                          type="button"
                          aria-expanded={expanded.has(n.id)}
                          onClick={() => onToggleExpand(n.id)}
                          className="mt-1.5 rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        >
                          {expanded.has(n.id) ? "Hide breakdown" : "Show breakdown"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
