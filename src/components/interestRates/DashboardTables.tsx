// Server-rendered parts of the Interest Rates dashboard: the headline tiles, the analytics tables (spread statistics, changes in pp and bp, period
// comparison) and the data coverage matrix. Every number shows its date and every comparison its sample size.

import type { ChangeRow, CoverageRow, PeriodRow, StatRow, Tile } from "@/lib/interestRates/viewModel";
import { formatDate } from "@/lib/policyRate/format";

const KIND_LABEL: Record<Tile["kind"], string> = { administered: "Set by SBP", market: "Market rate", auction: "Auction result", survey: "Bank survey", derived: "Derived" };
const fmtDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? formatDate(d) : /^\d{4}-\d{2}$/.test(d) ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(d.slice(5)) - 1]} ${d.slice(0, 4)}` : d);
const signed = (v: number, dp = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(dp)}`;

export function Tiles({ tiles }: { tiles: Tile[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <li key={t.id} className="flex min-w-0 flex-col gap-0.5 rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-2.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-medium text-pe-text-2">{t.label}</span>
            <span className="shrink-0 rounded-[var(--pe-radius-sm)] bg-pe-surface-2 px-1.5 py-0.5 text-[11px] text-pe-text-3">{KIND_LABEL[t.kind]}</span>
          </span>
          <span className="text-[22px] font-semibold tabular-nums leading-tight text-pe-text">{t.value === null ? (t.display ?? "—") : `${t.value.toFixed(2)}%`}</span>
          <span className="text-[12px] text-pe-text-3">{t.dateLabel}</span>
          <span className="mt-0.5 text-[12px] leading-snug text-pe-text-2">{t.note}</span>
        </li>
      ))}
    </ul>
  );
}

function Table({ caption, head, children, minWidth = 640 }: { caption: string; head: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label={`${caption} (scrolls)`}>
      <table className="w-full border-collapse text-[13px] tabular-nums" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-pe-surface-2 text-pe-text-2">
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" className={`px-2.5 py-1.5 font-medium ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-pe-text">{children}</tbody>
      </table>
    </div>
  );
}

export function SpreadStats({ rows }: { rows: StatRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[15px] font-semibold text-pe-text">Spreads and real rates: latest, average and range</h3>
      <p className="max-w-3xl text-[14px] leading-relaxed text-pe-text-2">Each figure is in percentage points over the whole available history of that series; n is the number of observations. Hover a row name for its formula.</p>
      <Table caption="Spread statistics" head={["Indicator", "Latest", "Average", "Lowest", "Highest", "n"]} minWidth={720}>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-pe-border">
            <th scope="row" className="px-2.5 py-1.5 text-left font-normal text-pe-text-2" title={r.formula}>
              {r.label}
              <span className="block text-[11px] text-pe-text-3">{r.frequency}</span>
            </th>
            {r.stats ? (
              <>
                <td className="px-2.5 py-1.5 text-right"><span className="font-medium">{signed(r.stats.latest.value)}</span><span className="block text-[11px] text-pe-text-3">{fmtDate(r.stats.latest.date)}</span></td>
                <td className="px-2.5 py-1.5 text-right">{signed(r.stats.mean)}<span className="block text-[11px] text-pe-text-3">since {fmtDate(r.stats.first.date)}</span></td>
                <td className="px-2.5 py-1.5 text-right">{signed(r.stats.min.value)}<span className="block text-[11px] text-pe-text-3">{fmtDate(r.stats.min.date)}</span></td>
                <td className="px-2.5 py-1.5 text-right">{signed(r.stats.max.value)}<span className="block text-[11px] text-pe-text-3">{fmtDate(r.stats.max.date)}</span></td>
                <td className="px-2.5 py-1.5 text-right">{r.stats.n.toLocaleString("en-US")}</td>
              </>
            ) : (
              <td colSpan={5} className="px-2.5 py-1.5 text-right text-pe-text-3">no data</td>
            )}
          </tr>
        ))}
      </Table>
    </div>
  );
}

export function Changes({ rows }: { rows: ChangeRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[15px] font-semibold text-pe-text">How far each rate has moved</h3>
      <p className="max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
        Latest observation against the observation on or before the same date one and three years earlier. 1 percentage point (pp) = 100 basis points (bp).
      </p>
      <Table caption="Changes in percentage points and basis points" head={["Rate", "Latest", "1 year earlier", "Change", "3 years earlier", "Change"]} minWidth={760}>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-pe-border">
            <th scope="row" className="px-2.5 py-1.5 text-left font-normal text-pe-text-2">{r.label}<span className="block text-[11px] text-pe-text-3">{r.frequency}</span></th>
            <td className="px-2.5 py-1.5 text-right">{r.latest ? <><span className="font-medium">{r.latest.value.toFixed(2)}%</span><span className="block text-[11px] text-pe-text-3">{fmtDate(r.latest.date)}</span></> : "—"}</td>
            <td className="px-2.5 py-1.5 text-right">{r.yearAgo ? <>{r.yearAgo.value.toFixed(2)}%<span className="block text-[11px] text-pe-text-3">{fmtDate(r.yearAgo.date)}</span></> : "—"}</td>
            <td className="px-2.5 py-1.5 text-right">{r.pp1y === null ? "—" : <>{signed(r.pp1y)} pp<span className="block text-[11px] text-pe-text-3">{signed(r.bp1y!, 0)} bp</span></>}</td>
            <td className="px-2.5 py-1.5 text-right">{r.threeYearsAgo ? <>{r.threeYearsAgo.value.toFixed(2)}%<span className="block text-[11px] text-pe-text-3">{fmtDate(r.threeYearsAgo.date)}</span></> : "—"}</td>
            <td className="px-2.5 py-1.5 text-right">{r.pp3y === null ? "—" : <>{signed(r.pp3y)} pp<span className="block text-[11px] text-pe-text-3">{signed(r.bp3y!, 0)} bp</span></>}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

export function Periods({ rows }: { rows: PeriodRow[] }) {
  const metrics = rows[0]?.metrics.map((m) => m.label) ?? [];
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[15px] font-semibold text-pe-text">Comparing periods</h3>
      <p className="max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
        Averages over fixed calendar windows. Each window is defined by its months only; the note under it states the policy rate at its start and end, taken
        from the data. Averages are in percentage points; n is the number of observations in the window.
      </p>
      <Table caption="Period comparison" head={["Period", ...metrics]} minWidth={760}>
        {rows.map((r) => (
          <tr key={r.period.id} className="border-t border-pe-border">
            <th scope="row" className="px-2.5 py-1.5 text-left font-normal text-pe-text-2">
              {r.period.label}
              <span className="block max-w-[22rem] text-[11px] leading-snug text-pe-text-3">{r.period.definition.replace(/^Calendar months .*? inclusive\. /, "")}</span>
            </th>
            {r.metrics.map((m) => (
              <td key={m.label} className="px-2.5 py-1.5 text-right">
                {m.stats ? <><span className="font-medium">{signed(m.stats.mean)}</span><span className="block text-[11px] text-pe-text-3">{signed(m.stats.min.value, 1)} to {signed(m.stats.max.value, 1)} · n = {m.stats.n.toLocaleString("en-US")}</span></> : <span className="text-pe-text-3">no data</span>}
              </td>
            ))}
          </tr>
        ))}
      </Table>
    </div>
  );
}

export function Coverage({ rows, retrievedOn }: { rows: CoverageRow[]; retrievedOn: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
        Every series on this page, where it comes from and how much of it exists. &ldquo;Observed&rdquo; means published by SBP; &ldquo;Derived&rdquo; means
        computed by PEIC from observed series with the formula shown. Sources retrieved {formatDate(retrievedOn)}; each source file is fingerprinted and every
        dataset is rebuilt and checked against SBP&rsquo;s own publications before release.
      </p>
      <Table caption="Data coverage matrix" head={["Series", "Type", "Frequency", "First", "Latest", "Observations", "Source"]} minWidth={900}>
        {rows.map((r) => (
          <tr key={`${r.family}-${r.series}`} className="border-t border-pe-border align-top">
            <th scope="row" className="px-2.5 py-1.5 text-left font-normal text-pe-text">
              {r.series}
              <span className="block max-w-[26rem] text-[11px] leading-snug text-pe-text-3">{r.notes}</span>
            </th>
            <td className="px-2.5 py-1.5 text-right">{r.kind}</td>
            <td className="px-2.5 py-1.5 text-right">{r.frequency}</td>
            <td className="whitespace-nowrap px-2.5 py-1.5 text-right">{fmtDate(r.first)}</td>
            <td className="whitespace-nowrap px-2.5 py-1.5 text-right">{fmtDate(r.last)}</td>
            <td className="px-2.5 py-1.5 text-right">{r.n.toLocaleString("en-US")}</td>
            <td className="px-2.5 py-1.5 text-right text-pe-text-2">{r.source}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
