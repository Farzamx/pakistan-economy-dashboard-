"use client";

import { useId } from "react";
import { NODE_COLORS, getConnections, type PositionedLink, type PositionedNode, type SankeyGraph, type SankeyLayout } from "@/lib/budget/budgetSankey";
import { formatBn, formatShare } from "@/lib/budget/sankeyFormat";

export type SankeyHover = { kind: "node" | "link"; id: string; clientX: number; clientY: number };

interface BudgetSankeySvgProps {
  layout: SankeyLayout;
  graph: SankeyGraph;
  selectedId: string | null;
  hover: SankeyHover | null;
  /** Total resources, the base of the percentage in each label. */
  totalResources: number;
  fiscalYear: string;
  onSelect: (id: string | null) => void;
  onHover: (h: SankeyHover | null) => void;
}

const LABEL = 12;

/**
 * Draws a laid-out Sankey. All geometry comes from layoutSankey; this component only paints it, so every ribbon is exactly value × scale wide. Nodes are
 * focusable buttons (Enter or Space selects, Escape clears); ribbons are decorative, their numbers are in the labels, the tooltip, the detail panel and
 * the table alternative. The ribbon reveal is a CSS animation that is switched off under reduced motion, and the final geometry is in the first paint.
 */
export default function BudgetSankeySvg({ layout, graph, selectedId, hover, totalResources, fiscalYear, onSelect, onHover }: BudgetSankeySvgProps) {
  const uid = useId().replace(/:/g, "");
  const hatchId = `hatch-${uid}`;
  const connected = selectedId ? getConnections(graph, selectedId) : null;
  const hoveredLink = hover?.kind === "link" ? hover.id : null;
  const lastColumn = layout.columns.length - 1;
  const nodesById = new Map(layout.nodes.map((n) => [n.id, n]));
  // room for a label beside its node: the side margin at either end, the gap between columns in the middle (a label that would run into the next column keeps only its name; its amount is in the tooltip, the detail panel and the table)
  const spacing = layout.columns.length > 1 ? layout.columns[1].x - layout.columns[0].x : 200;
  const roomFor = (column: number) => (column === 0 && lastColumn > 0 ? 160 : column === lastColumn ? layout.width - (layout.columns[lastColumn].x + layout.nodeWidth) - 20 : spacing - layout.nodeWidth - 26);
  const CHAR = 6.4;

  const linkOpacity = (l: PositionedLink): number => {
    if (hoveredLink === l.id) return 0.85;
    if (connected) return connected.linkIds.has(l.id) ? 0.7 : 0.08;
    return 0.42;
  };
  const nodeOpacity = (n: PositionedNode): number => (connected && !connected.nodeIds.has(n.id) ? 0.3 : 1);
  const fillFor = (n: PositionedNode) => NODE_COLORS[n.colorKey] ?? "#64748b";

  const nodeLabel = (n: PositionedNode) => {
    const pct = totalResources > 0 ? (n.value / totalResources) * 100 : 0;
    return `${n.label}: ${formatBn(n.value)}, ${formatShare(pct)} of total resources.`;
  };

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="group"
      aria-label={`Flow of the FY${fiscalYear} federal budget from revenue and borrowing to spending, in Rs billion`}
      className="h-auto w-full select-none"
      style={{ minWidth: 960 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onSelect(null);
      }}
      data-testid="budget-sankey-svg"
    >
      <style>{`
        @keyframes sankey-reveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
        @keyframes sankey-fade { from { opacity: 0; } to { opacity: 1; } }
        .sankey-links-${uid} { animation: sankey-reveal 1s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .sankey-nodes-${uid} { animation: sankey-fade 0.6s ease-out both; }
        .sankey-node-${uid} { cursor: pointer; outline: none; transition: opacity 0.15s; }
        .sankey-node-${uid}:focus-visible .sankey-rect { stroke: var(--text-primary); stroke-width: 2.5; }
        .sankey-link-${uid} { transition: stroke-opacity 0.15s; }
        @media (prefers-reduced-motion: reduce) { .sankey-links-${uid}, .sankey-nodes-${uid} { animation: none; } .sankey-node-${uid}, .sankey-link-${uid} { transition: none; } }
      `}</style>
      <defs>
        <pattern id={hatchId} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={NODE_COLORS.financing} />
          <rect width="2.4" height="6" fill="rgba(255,255,255,0.55)" />
        </pattern>
      </defs>

      {/* stage headings */}
      <g aria-hidden="true">
        {layout.columns.map((c) => (
          <g key={c.stage}>
            <text x={c.x + layout.nodeWidth / 2} y={20} textAnchor="middle" fontSize={11} fontWeight={600} letterSpacing="0.08em" style={{ fill: "var(--text-secondary)", textTransform: "uppercase" }}>
              {c.title}
            </text>
            <line x1={c.x + layout.nodeWidth / 2} x2={c.x + layout.nodeWidth / 2} y1={28} y2={36} style={{ stroke: "var(--border)" }} />
          </g>
        ))}
      </g>

      {/* ribbons */}
      <g className={`sankey-links-${uid}`} fill="none" aria-hidden="true">
        {layout.links.map((l) => {
          // ribbons take the colour of what they carry: the source on the way into the pool, the destination on the way out of it
          const source = nodesById.get(l.source);
          const colorNode = source?.kind === "total" ? nodesById.get(l.target) : source;
          const financing = colorNode?.kind === "financing";
          return (
            <g key={l.id}>
              <path
                className={`sankey-link-${uid}`}
                d={l.path}
                stroke={financing ? `url(#${hatchId})` : colorNode ? fillFor(colorNode) : "#64748b"}
                strokeWidth={l.width}
                strokeOpacity={linkOpacity(l)}
              />
              {/* a wider invisible path keeps hairline flows hoverable */}
              <path
                d={l.path}
                stroke="transparent"
                strokeWidth={Math.max(l.width, 9)}
                style={{ pointerEvents: "stroke", cursor: "default" }}
                onMouseEnter={(e) => onHover({ kind: "link", id: l.id, clientX: e.clientX, clientY: e.clientY })}
                onMouseMove={(e) => onHover({ kind: "link", id: l.id, clientX: e.clientX, clientY: e.clientY })}
                onMouseLeave={() => onHover(null)}
              />
            </g>
          );
        })}
      </g>

      {/* nodes and labels */}
      <g className={`sankey-nodes-${uid}`}>
        {layout.nodes.map((n) => {
          const isFirst = n.column === 0;
          const isLast = n.column === lastColumn;
          const left = isFirst && !isLast;
          const tx = left ? n.x - 9 : n.x + layout.nodeWidth + 9;
          const anchor = left ? "end" : "start";
          const pct = totalResources > 0 ? (n.value / totalResources) * 100 : 0;
          const twoLines = n.height >= 26;
          const inlineAmount = !twoLines && (n.label.length + 3 + formatBn(n.value).length) * CHAR <= roomFor(n.column);
          const selected = selectedId === n.id;
          const cy = n.y + n.height / 2;
          return (
            <g
              key={n.id}
              className={`sankey-node-${uid}`}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={nodeLabel(n)}
              opacity={nodeOpacity(n)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(selected ? null : n.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(selected ? null : n.id);
                }
              }}
              onMouseEnter={(e) => onHover({ kind: "node", id: n.id, clientX: e.clientX, clientY: e.clientY })}
              onMouseMove={(e) => onHover({ kind: "node", id: n.id, clientX: e.clientX, clientY: e.clientY })}
              onMouseLeave={() => onHover(null)}
              onFocus={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                onHover({ kind: "node", id: n.id, clientX: r.right, clientY: r.top + r.height / 2 });
              }}
              onBlur={() => onHover(null)}
            >
              {/* a wider invisible target for the thin nodes */}
              <rect x={n.x - 4} y={n.y - 3} width={layout.nodeWidth + 8} height={n.height + 6} fill="transparent" />
              <rect className="sankey-rect" x={n.x} y={n.y} width={layout.nodeWidth} height={n.height} rx={2} fill={n.kind === "financing" ? `url(#${hatchId})` : fillFor(n)} stroke={selected ? "var(--text-primary)" : "none"} strokeWidth={selected ? 2.5 : 0} />
              <text
                x={tx}
                y={twoLines ? cy - 7 : cy}
                textAnchor={anchor}
                dominantBaseline="central"
                fontSize={LABEL}
                fontWeight={selected ? 800 : 600}
                paintOrder="stroke"
                strokeWidth={3.5}
                strokeLinejoin="round"
                style={{ fill: "var(--text-primary)", stroke: "var(--space-800)" }}
              >
                {n.label}
                {n.derived ? " *" : ""}
                {inlineAmount && (
                  <tspan fontWeight={400} fontSize={LABEL - 1} style={{ fill: "var(--text-secondary)" }}>
                    {` · ${formatBn(n.value)}`}
                  </tspan>
                )}
              </text>
              {twoLines && (
                <text x={tx} y={cy + 8} textAnchor={anchor} dominantBaseline="central" fontSize={LABEL - 1} paintOrder="stroke" strokeWidth={3.5} strokeLinejoin="round" style={{ fill: "var(--text-secondary)", stroke: "var(--space-800)" }}>
                  {formatBn(n.value)} · {formatShare(pct)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
