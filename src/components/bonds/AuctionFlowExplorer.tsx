"use client";

import { useId, useMemo, useState } from "react";
import { Segmented, Select } from "@/components/analytics/controls";
import { TipRow, TipTitle, TooltipBox, useChartTooltip } from "@/components/analytics/tooltip";
import { useTooltipHandlers } from "./useTooltipHandlers";
import { YIELD_DEFINITION_LABEL, flowRows, tenorsFor, type FlowRow, type YieldDefinition } from "@/lib/bonds/analytics";
import { niceTicks } from "@/lib/bonds/curveGeometry";
import { TENOR_LABEL, type AuctionRecord, type Instrument, type Tenor } from "@/lib/bonds/types";
import { formatDate, shortDate } from "@/lib/policyRate/format";

interface AuctionFlowExplorerProps {
  tbills: AuctionRecord[];
  pibs: AuctionRecord[];
  def: YieldDefinition;
}

const OUTCOME_TEXT: Record<string, string> = { accepted: "Bids accepted", "bids-rejected": "Bids rejected", "no-bids": "No bids received", "none-accepted": "Bids received, none accepted", mixed: "Some tenors failed" };
const bn = (million: number | null) => (million === null ? "—" : `Rs ${(million / 1000).toLocaleString("en-US", { maximumFractionDigits: million >= 100000 ? 0 : 1 })}bn`);
const times = (v: number | null) => (v === null ? "—" : `${v.toFixed(2).replace(/\.?0+$/, "")}×`);

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function AuctionFlowExplorer({ tbills, pibs, def }: AuctionFlowExplorerProps) {
  const uid = useId().replace(/:/g, "");
  const [tip, attach] = useChartTooltip<FlowRow>();
  const { hit, onBlankPointerDown } = useTooltipHandlers(tip);
  const [instrument, setInstrument] = useState<Instrument>("tbill");
  const [tenor, setTenor] = useState<Tenor | "all">("all");
  const [windowSize, setWindowSize] = useState<12 | 24 | 52>(24);
  const [picked, setPicked] = useState<string | null>(null);

  const auctions = instrument === "tbill" ? tbills : pibs;
  const tenors = tenorsFor(instrument);
  const effectiveTenor: Tenor | "all" = tenor === "all" || tenors.includes(tenor) ? tenor : "all";
  const rows = useMemo(() => flowRows(auctions, effectiveTenor, def).slice(-windowSize), [auctions, effectiveTenor, def, windowSize]);
  const selected = rows.find((r) => r.date === picked) ?? rows[rows.length - 1] ?? null;

  const width = Math.max(tip.width, 300);
  const single = effectiveTenor !== "all";
  const barsH = single ? 210 : 260;
  const yieldH = single ? 76 : 0;
  const m = { top: 14, right: 12, bottom: 34, left: 52 };
  const height = m.top + barsH + (single ? 26 + yieldH : 0) + m.bottom;
  const innerW = Math.max(width - m.left - m.right, 40);
  const band = rows.length ? innerW / rows.length : innerW;

  const maxVal = Math.max(1, ...rows.flatMap((r) => [r.offered, r.accepted, r.target].filter((v): v is number => v !== null))) / 1000;
  const ticks = niceTicks(0, maxVal, 4);
  const top = ticks[ticks.length - 1];
  const yBar = (v: number) => m.top + barsH - (v / top) * barsH;

  const yields = rows.map((r) => r.yield).filter((v): v is number => v !== null);
  const yTicks = single && yields.length ? niceTicks(Math.min(...yields) - 0.1, Math.max(...yields) + 0.1, 2) : [];
  const yLo = yTicks[0] ?? 0;
  const yHi = yTicks[yTicks.length - 1] ?? 1;
  const yoff = m.top + barsH + 26;
  const yYield = (v: number) => yoff + yieldH - ((v - yLo) / (yHi - yLo || 1)) * yieldH;
  const labelEvery = Math.max(1, Math.ceil(rows.length / Math.max(Math.floor(innerW / 64), 2)));

  const ratios = rows.map((r) => r.offeredOverTarget).filter((v): v is number => v !== null);
  const med = median(ratios);
  const latestRatio = rows[rows.length - 1]?.offeredOverTarget ?? null;
  const failedCount = rows.filter((r) => r.outcome !== "accepted").length;

  return (
    <div className="flex flex-col gap-4" data-testid="auction-flow-explorer">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <Segmented
          label="Securities"
          name={`${uid}-ins`}
          value={instrument}
          onChange={(v) => {
            setInstrument(v);
            setTenor("all");
            setPicked(null);
          }}
          options={[{ value: "tbill", label: "T-bills" }, { value: "pib", label: "PIBs" }]}
        />
        <Select label="Tenor" id={`${uid}-tenor`} value={effectiveTenor} onChange={(v) => { setTenor(v); setPicked(null); }} options={[{ value: "all", label: "All tenors together" }, ...tenors.map((t) => ({ value: t, label: TENOR_LABEL[t] }))]} />
        <Segmented
          label="Auctions shown"
          name={`${uid}-win`}
          value={String(windowSize) as "12" | "24" | "52"}
          onChange={(v) => setWindowSize(Number(v) as 12 | 24 | 52)}
          options={[{ value: "12", label: "Last 12" }, { value: "24", label: "Last 24" }, ...(instrument === "tbill" ? [{ value: "52", label: "Last 52" }] : [])]}
        />
      </div>

      {rows.length === 0 ? (
        <p className="px-1 py-10 text-center text-[13px] text-pe-text-3">No auctions for this selection.</p>
      ) : (
        <div ref={attach} className="relative" data-testid="flow-chart">
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Offered and accepted amounts per ${instrument === "tbill" ? "T-bill" : "PIB"} auction, PKR billion face value`} className="block max-w-full" onPointerDown={onBlankPointerDown}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={m.left + innerW} y1={yBar(t)} y2={yBar(t)} stroke="var(--chart-grid)" />
                <text x={m.left - 6} y={yBar(t)} textAnchor="end" dominantBaseline="central" fontSize={11} fill="var(--chart-axis)" className="tabular-nums">
                  {t.toLocaleString("en-US")}
                </text>
              </g>
            ))}
            <text x={m.left - 6} y={m.top - 4} textAnchor="end" fontSize={10} fill="var(--chart-axis)">
              Rs bn
            </text>

            {rows.map((r, i) => {
              const cx = m.left + band * i + band / 2;
              const wOff = Math.max(Math.min(band * 0.74, 34), 3);
              const wAcc = Math.max(wOff * 0.5, 2);
              const isSel = selected?.date === r.date;
              const failed = r.outcome !== "accepted";
              return (
                <g key={r.date}>
                  {isSel && <rect x={cx - band / 2} y={m.top} width={band} height={barsH + (single ? 26 + yieldH : 0)} fill="var(--pe-accent)" opacity={0.08} />}
                  {r.offered !== null && <rect x={cx - wOff / 2} y={yBar(r.offered / 1000)} width={wOff} height={Math.max(m.top + barsH - yBar(r.offered / 1000), 0)} fill="var(--pe-viz-blue)" opacity={0.3} />}
                  {r.accepted !== null && <rect x={cx - wAcc / 2} y={yBar(r.accepted / 1000)} width={wAcc} height={Math.max(m.top + barsH - yBar(r.accepted / 1000), 0)} fill="var(--pe-viz-blue)" />}
                  {r.target !== null && <line x1={cx - wOff / 2 - 2} x2={cx + wOff / 2 + 2} y1={yBar(r.target / 1000)} y2={yBar(r.target / 1000)} stroke="var(--pe-text)" strokeWidth={2} />}
                  {failed && (
                    <g stroke="var(--pe-viz-orange)" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
                      <line x1={cx - 4} y1={m.top + barsH - 10} x2={cx + 4} y2={m.top + barsH - 2} />
                      <line x1={cx - 4} y1={m.top + barsH - 2} x2={cx + 4} y2={m.top + barsH - 10} />
                    </g>
                  )}
                  {i % labelEvery === 0 && (
                    <text x={cx} y={height - 14} textAnchor="middle" fontSize={10} fill="var(--chart-axis)">
                      {shortDate(r.date)}
                    </text>
                  )}
                  <rect
                    x={cx - band / 2}
                    y={m.top}
                    width={band}
                    height={barsH + (single ? 26 + yieldH : 0)}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSel}
                    aria-label={`${formatDate(r.date)}: offered ${bn(r.offered)}, accepted ${bn(r.accepted)}${r.target !== null ? `, target ${bn(r.target)}` : ""}, ${OUTCOME_TEXT[r.outcome] ?? r.outcome}`}
                    className="cursor-pointer outline-none focus-visible:[stroke:var(--pe-focus)] focus-visible:[stroke-width:2]"
                    onClick={() => setPicked(r.date)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPicked(r.date);
                      }
                    }}
                    {...hit(r)}
                  />
                </g>
              );
            })}
            <line x1={m.left} x2={m.left + innerW} y1={m.top + barsH} y2={m.top + barsH} stroke="var(--chart-axis)" />

            {single && (
              <g>
                <text x={m.left - 6} y={yoff - 6} textAnchor="end" fontSize={10} fill="var(--chart-axis)">
                  {YIELD_DEFINITION_LABEL[def]}, %
                </text>
                {yTicks.map((t) => (
                  <g key={t}>
                    <line x1={m.left} x2={m.left + innerW} y1={yYield(t)} y2={yYield(t)} stroke="var(--chart-grid)" />
                    <text x={m.left - 6} y={yYield(t)} textAnchor="end" dominantBaseline="central" fontSize={10} fill="var(--chart-axis)" className="tabular-nums">
                      {t.toFixed(1)}
                    </text>
                  </g>
                ))}
                {(() => {
                  const runs: string[] = [];
                  let cur: string[] = [];
                  rows.forEach((r, i) => {
                    const x = m.left + band * i + band / 2;
                    if (r.yield === null) {
                      if (cur.length > 1) runs.push(cur.join(" "));
                      cur = [];
                    } else cur.push(`${cur.length === 0 ? "M" : "L"}${x.toFixed(1)},${yYield(r.yield).toFixed(1)}`);
                  });
                  if (cur.length > 1) runs.push(cur.join(" "));
                  return runs.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--pe-viz-purple)" strokeWidth={2} strokeLinejoin="round" />);
                })()}
                {rows.map((r, i) => (r.yield === null ? null : <circle key={r.date} cx={m.left + band * i + band / 2} cy={yYield(r.yield)} r={2.75} fill="var(--pe-viz-purple)" />))}
              </g>
            )}
          </svg>
          <TooltipBox api={tip}>
            {(r) => (
              <>
                <TipTitle>{formatDate(r.date)}{r.auctionNo ? ` · auction ${r.auctionNo}` : ""}</TipTitle>
                <TipRow label="Offered" value={bn(r.offered)} />
                <TipRow label="Accepted" value={bn(r.accepted)} />
                {r.target !== null && <TipRow label="Target" value={bn(r.target)} />}
                {r.offeredOverTarget !== null && <TipRow label="Offered ÷ target" value={times(r.offeredOverTarget)} />}
                {r.yield !== null && <TipRow label={YIELD_DEFINITION_LABEL[def]} value={`${r.yield.toFixed(2)}%`} />}
                <p className="mt-1 text-[11px]" style={{ color: "var(--chart-tooltip-label)" }}>{OUTCOME_TEXT[r.outcome] ?? r.outcome}</p>
              </>
            )}
          </TooltipBox>
        </div>
      )}

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-pe-text-2" aria-label="Key">
        <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-3 w-3 rounded-[2px] opacity-30" style={{ background: "var(--pe-viz-blue)" }} />Competitive bids offered</li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-3 w-1.5 rounded-[2px]" style={{ background: "var(--pe-viz-blue)" }} />Total accepted</li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-0.5 w-4" style={{ background: "var(--pe-text)" }} />Target</li>
        <li className="flex items-center gap-1.5 text-pe-text-3"><span aria-hidden>{"×"}</span>nothing accepted</li>
      </ul>

      {selected && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-3.5" data-testid="flow-detail">
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-pe-text-3">{formatDate(selected.date)}{selected.auctionNo ? ` · auction ${selected.auctionNo}` : ""}</h4>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[13px] tabular-nums">
              <dt className="text-pe-text-3">Offered</dt><dd className="text-right text-pe-text">{bn(selected.offered)}</dd>
              <dt className="text-pe-text-3">Accepted</dt><dd className="text-right text-pe-text">{bn(selected.accepted)}</dd>
              <dt className="text-pe-text-3">Target</dt><dd className="text-right text-pe-text">{selected.target === null ? "not published per tenor" : bn(selected.target)}</dd>
              <dt className="text-pe-text-3">Offered ÷ target</dt><dd className="text-right text-pe-text">{times(selected.offeredOverTarget)}</dd>
              <dt className="text-pe-text-3">Accepted ÷ target</dt><dd className="text-right text-pe-text">{times(selected.acceptedOverTarget)}</dd>
              {single && (<><dt className="text-pe-text-3">{YIELD_DEFINITION_LABEL[def]}</dt><dd className="text-right text-pe-text">{selected.yield === null ? "—" : `${selected.yield.toFixed(4)}%`}</dd></>)}
              <dt className="text-pe-text-3">Outcome</dt><dd className="text-right text-pe-text">{OUTCOME_TEXT[selected.outcome] ?? selected.outcome}</dd>
            </dl>
          </div>
          <div className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface p-3.5">
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-pe-text-3">Over the {rows.length} auctions shown</h4>
            <p className="mt-2 text-[13px] text-pe-text-2">
              {med !== null ? <>Bids offered were a median <strong className="font-semibold text-pe-text">{times(med)}</strong> the target{latestRatio !== null ? <>; the latest auction drew <strong className="font-semibold text-pe-text">{times(latestRatio)}</strong></> : null}. </> : "No target is published per tenor for these auctions, so bids cannot be set against it. "}
              {failedCount > 0 ? `${failedCount} of ${rows.length} had a tenor with nothing accepted.` : "Every auction accepted bids."}
            </p>
            <p className="mt-2 text-[11px] text-pe-text-3">Amounts are face value. &ldquo;Accepted&rdquo; adds competitive and non-competitive bids (and short sales for PIBs); non-competitive bids, including provincial governments&apos;, are often a large part of it.</p>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <details className="text-[12px] text-pe-text-2">
          <summary className="cursor-pointer select-none text-pe-accent hover:underline">View the numbers as a table</summary>
          <div className="mt-2 max-h-72 overflow-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Auction amounts (scrolls)">
            <table className="w-full min-w-[560px] border-collapse text-left tabular-nums">
              <caption className="sr-only">Offered, accepted and target amounts per auction, PKR million face value</caption>
              <thead className="sticky top-0 bg-pe-surface-2 text-pe-text-2">
                <tr>
                  <th scope="col" className="px-2.5 py-1.5 font-medium">Auction date</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Offered, Rs m</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Accepted, Rs m</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Target, Rs m</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Offered ÷ target</th>
                  <th scope="col" className="px-2.5 py-1.5 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.date} className="border-t border-pe-border">
                    <th scope="row" className="whitespace-nowrap px-2.5 py-1 text-left font-normal text-pe-text-2">{formatDate(r.date)}</th>
                    <td className="px-2.5 py-1 text-right">{r.offered === null ? "no data" : r.offered.toLocaleString("en-US", { maximumFractionDigits: 1 })}</td>
                    <td className="px-2.5 py-1 text-right">{r.accepted === null ? "none" : r.accepted.toLocaleString("en-US", { maximumFractionDigits: 1 })}</td>
                    <td className="px-2.5 py-1 text-right">{r.target === null ? "no data" : r.target.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                    <td className="px-2.5 py-1 text-right">{times(r.offeredOverTarget)}</td>
                    <td className="px-2.5 py-1">{OUTCOME_TEXT[r.outcome] ?? r.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
