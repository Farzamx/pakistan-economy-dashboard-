// Where the CPI-group data on this page came from, and how fresh each part of it is.
//
// Two server components over one pure model (src/lib/inflation/groupSource.ts):
//   GroupSourceStrip  — a one-line label above each group-derived section; a notice (not an alarm) when the page is on a fallback
//   DataStatusPanel   — the six facts, kept apart, in the methodology section
//
// The six facts answer six different questions and are NEVER merged into one badge. In particular an ingestion run that finds
// nothing new writes nothing, so "last ingestion run" can be recent while "last data change" is old, and both can differ from
// "latest observation period". Nothing here says whether scheduled ingestion is configured or active: only what the data shows.

import { monthLabel } from "@/lib/inflation/periods";
import { fallbackNotice, type GroupSourceInfo } from "@/lib/inflation/groupSource";

/** "6 Nov 2026, 17:29 UTC" — always UTC and always labelled, so the same render reads the same everywhere. */
export function formatUtc(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });
  return `${date}, ${time} UTC`;
}

const OUTCOME_TEXT: Record<string, string> = {
  updated: "wrote new observations",
  unchanged: "found nothing new",
  partial: "only part of the release was stored",
  rejected: "PBS's file was rejected by validation",
  "pbs-unavailable": "PBS could not be reached",
  busy: "another run was in progress",
  error: "ended with an unexpected error",
};

export function GroupSourceStrip({ source }: { source: GroupSourceInfo | null }) {
  if (!source || source.source === null) return null; // no panel: the sections show their own "unavailable" notice
  const notice = fallbackNotice(source);
  const onFallback = source.fallback;
  return (
    <p
      className="rounded-[var(--pe-radius)] border px-3 py-2 text-[12.5px] leading-relaxed"
      style={onFallback ? { background: "var(--pe-warn-bg)", borderColor: "var(--pe-warn-border)", color: "var(--pe-warn-text)" } : { background: "var(--pe-surface-2)", borderColor: "var(--pe-border)", color: "var(--pe-text-2)" }}
    >
      <span className="font-medium" style={{ color: onFallback ? "var(--pe-warn-text)" : "var(--pe-text)" }}>
        {onFallback ? "Fallback source in use. " : "Group data source. "}
      </span>
      {source.label}
      {source.latestPeriod ? ` · latest month ${monthLabel(source.latestPeriod)}` : ""}.
      {notice ? ` ${notice}` : ""}{" "}
      <a href="#data-status" className="whitespace-nowrap underline underline-offset-2" style={{ color: "inherit" }}>
        Data status
      </a>
    </p>
  );
}

function Row({ n, term, answer, children }: { n: number; term: string; answer: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-3 py-2.5 md:grid-cols-[15rem_1fr] md:gap-4">
      <dt>
        <span className="text-[13px] font-medium text-pe-text">{term}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-pe-text-3">{answer}</span>
        <span className="sr-only">Fact {n} of 6.</span>
      </dt>
      <dd className="text-[13px] leading-relaxed text-pe-text-2">{children}</dd>
    </div>
  );
}

export function DataStatusPanel({ source }: { source: GroupSourceInfo | null }) {
  if (!source) {
    return <p className="text-[13px] text-pe-text-2">Source and freshness details were not available on this load.</p>;
  }
  const run = source.lastIngestionRun;
  const notice = fallbackNotice(source);
  const behind = source.ledgerLatestPeriod !== null && source.ledgerLatestPeriod < source.expectedPeriod;

  return (
    <div>
      <dl className="flex flex-col divide-y divide-pe-border rounded-[var(--pe-radius)] border border-pe-border">
        <Row n={1} term="Latest observation period" answer="Which month the newest figure describes.">
          {source.latestPeriod ? (
            <>
              <strong className="font-medium text-pe-text">{monthLabel(source.latestPeriod)}</strong>
              {behind ? ` — PEIC's stored copy ends at ${monthLabel(source.ledgerLatestPeriod as string)}; a current copy would hold ${monthLabel(source.expectedPeriod)}.` : "."}
            </>
          ) : (
            "No group data is shown on this load."
          )}
        </Row>
        <Row n={2} term="Last ingestion run" answer="When PEIC's ingestion job last ran, and how it ended.">
          {run ? (
            <>
              <strong className="font-medium text-pe-text">{formatUtc(run.at)}</strong> · {run.status}
              {run.outcome ? ` — ${OUTCOME_TEXT[run.outcome] ?? run.outcome}` : ""}. A run that finds nothing new changes no data.
            </>
          ) : (
            "No ingestion run is on record (or the run history could not be read)."
          )}
        </Row>
        <Row n={3} term="Last data change" answer="When PEIC last wrote a figure to its stored copy.">
          {source.lastDataChangeAt ? (
            <>
              <strong className="font-medium text-pe-text">{formatUtc(source.lastDataChangeAt)}</strong>
              {source.sourceFilePreparedAt ? ` · PBS prepared the file it came from on ${formatUtc(source.sourceFilePreparedAt)}` : ""}.
            </>
          ) : (
            "Not available — PEIC's stored copy could not be read on this load."
          )}
        </Row>
        <Row n={4} term="Last source fetch" answer="When PEIC last heard from PBS.">
          {source.lastSourceFetch ? (
            <>
              <strong className="font-medium text-pe-text">{formatUtc(source.lastSourceFetch.at)}</strong>
              {source.lastSourceFetch.by === "page-generation" ? " — this page read PBS's file while it was being generated." : " — the last ingestion run that obtained PBS's file."}
            </>
          ) : (
            "None on record: this page did not need PBS, and no ingestion run that reached PBS is on record."
          )}
        </Row>
        <Row n={5} term="Last page generation" answer="How old the page you are reading is.">
          <strong className="font-medium text-pe-text">{formatUtc(source.pageGeneratedAt)}</strong> — the page is regenerated at most once an hour.
        </Row>
        <Row n={6} term="Current source" answer="Which path supplied the group data, and why.">
          <strong className="font-medium text-pe-text">{source.label}.</strong>{" "}
          {source.fallback ? "This is a fallback." : "This is the primary source."}
          {notice ? ` ${notice}` : ""}
        </Row>
      </dl>
      <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-pe-text-3">
        These are six different questions, so they can differ without anything being wrong: a recent run with nothing new leaves the data change old, and an old data change is normal between PBS releases. They are never combined into one &ldquo;freshness&rdquo; score. Headline and core inflation, food, the policy rate, the CPI index and the international figures come from their own sources, described in the table above.
      </p>
    </div>
  );
}
