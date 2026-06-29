import { PDFParse } from "pdf-parse";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";

// Official Calendar Synchronization System — periodically fetches and
// parses the actual, live official advance calendars this dashboard relies
// on (SBP's MPC calendar page, SBP DMMD's Treasury Bill / PIB auction
// PDFs), and reconciles the result into Supabase via
// reconcile_official_calendar() (0014_official_calendar_sync.sql). This is
// what makes "official data overrides estimated recurrence" genuinely
// true going forward, not just true at the one-time seed in 0013 — if SBP
// republishes a calendar with a changed/added/removed date, this picks it
// up on the next daily cron run without any migration.
//
// Deliberately NOT built for every series this calendar tracks: CPI, Core
// Inflation, SPI, Trade Balance, Remittances, Current Account, and LSM
// have no official ADVANCE calendar at all (confirmed during the Economic
// Calendar integrity audit — PBS publishes the releases themselves, not a
// forward schedule of when they'll happen). There is nothing for a sync
// layer to fetch for those; the recurrence-rule estimation already built
// for them (generate_next_occurrence()'s monthly_lag/weekly types) is
// already the best available approach, exactly matching this system's own
// official-source-priority ordering ("verified historical recurrence"
// outranks "manual maintenance" when no official calendar exists).
//
// GDP's PBS "Advance Release Calendar of National Accounts" exists in
// principle but its current stable URL could not be located this session
// (the candidate URL found via search returned an HTML page disguised as
// a 200 response, not the actual PDF — the same failure mode spi.ts's own
// comments already document for a different PBS path). GDP stays
// recurrence_type='manual'. Not fabricated — left honestly unautomated.
//
// Fail-safe by construction: every parser below returns null (never an
// empty-but-"successful" result) on any fetch/parse failure or
// implausible output, and the caller never calls reconcile_official_calendar
// with null/empty data (0014's RPC also independently refuses an empty
// array, as a second line of defense) — a broken parser or a network
// hiccup just skips that source for the day rather than touching the
// database with bad data.

const FETCH_TIMEOUT_MS = 15_000;
const MONTH_INDEX: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

/** Parses SBP's "D-Mon-YY" / "DD-MonthName-YY" date tokens (both forms appear, sometimes in the same table) into "YYYY-MM-DD". Returns null rather than guessing on anything that doesn't cleanly match — a malformed token must never become a silently-wrong date. */
export function parseSbpDateToken(token: string): string | null {
  const match = token.trim().match(/^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = MONTH_INDEX[match[2].toLowerCase()];
  if (month === undefined || day < 1 || day > 31) return null;
  const yearRaw = match[3];
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  const d = new Date(Date.UTC(year, month, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

export interface OfficialDate {
  event_date: string;
  event_time?: string;
  source_url: string;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PakEconIntelBot/1.0)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchPdfText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PakEconIntelBot/1.0)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // A real PDF starts with "%PDF" — some PBS/SBP paths have been known
    // to 200 with an HTML error page instead of the actual file (see
    // spi.ts's own comments on this exact failure mode), and pdf-parse's
    // error on that input isn't always a clean throw worth depending on.
    if (buf.subarray(0, 4).toString("ascii") !== "%PDF") return null;
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  } catch {
    return null;
  }
}

const MPC_CALENDAR_URL = "https://www.sbp.org.pk/m_policy/mp-calendar.asp";

/** Parses SBP's "Advance Calendar of Monetary Policy Committee (MPC) Meetings & Communications" table. Anchored on that exact heading text rather than positional table-index, so an unrelated table elsewhere on the page can never be mistaken for this one. Column order (confirmed against the live page): MPC Meeting Date, Statement, Analyst Briefing, Press Conference, Minutes, Monetary Policy Report. */
export function parseMpcCalendarHtml(html: string): { mpcDates: OfficialDate[]; reportDates: OfficialDate[] } | null {
  const anchorIndex = html.indexOf("Advance Calendar of Monetary Policy Committee");
  if (anchorIndex === -1) return null;
  const tableStart = html.indexOf("<table", anchorIndex);
  const tableEnd = html.indexOf("</table>", tableStart);
  if (tableStart === -1 || tableEnd === -1) return null;
  const tableHtml = html.slice(tableStart, tableEnd);

  const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const mpcDates: OfficialDate[] = [];
  const reportDates: OfficialDate[] = [];

  for (const rowMatch of rowMatches) {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim());
    if (cells.length < 6) continue;
    const mpcDate = parseSbpDateToken(cells[0]);
    if (!mpcDate) continue; // header row or footnote row — not a data row
    mpcDates.push({ event_date: mpcDate, event_time: "14:00", source_url: MPC_CALENDAR_URL });
    const reportDate = parseSbpDateToken(cells[5]);
    if (reportDate) reportDates.push({ event_date: reportDate, event_time: "12:00", source_url: MPC_CALENDAR_URL });
  }

  if (mpcDates.length === 0) return null;
  return { mpcDates, reportDates };
}

export async function syncMpcAndReportCalendar(): Promise<{ mpc: OfficialDate[] | null; report: OfficialDate[] | null }> {
  const html = await fetchText(MPC_CALENDAR_URL);
  if (!html) return { mpc: null, report: null };
  const parsed = parseMpcCalendarHtml(html);
  if (!parsed) return { mpc: null, report: null };
  return { mpc: parsed.mpcDates, report: parsed.reportDates.length > 0 ? parsed.reportDates : null };
}

const TBILL_PDF_URL = "https://www.sbp.org.pk/ecodata/auction-treasurybills.pdf";
const PIB_PDF_URL = "https://www.sbp.org.pk/ecodata/auction-bond.pdf";

/** T-Bill auction rows read "<auction-date> <settlement-date> <amounts...>" — the auction date is always the FIRST date-like token on the line. Critically, this PDF's text-extraction reading order does NOT match its visual layout: the auction-target rows come first in the extracted text, immediately followed by a "Maturity Dates" table and a "Tenor Wise Auction Targets" table that ALSO contain rows of consecutive dates — without cutting the search text off at "Communication of Result" (the heading that marks the end of the auction-target block), those later tables' dates would be misread as additional auction dates. Confirmed against the live PDF's actual extracted text, not assumed. */
export function parseTbillAuctionPdfText(text: string): OfficialDate[] | null {
  const cutoff = text.indexOf("Communication of Result");
  const searchText = cutoff === -1 ? text : text.slice(0, cutoff);
  const matches = [...searchText.matchAll(/(?:^|\s)(\d{1,2}-[A-Za-z]+-\d{2})\s+\d{1,2}-[A-Za-z]+-\d{2}\s+[\d,]/g)];
  const dates = matches.map((m) => parseSbpDateToken(m[1])).filter((d): d is string => d !== null);
  const unique = [...new Set(dates)];
  if (unique.length === 0) return null;
  return unique.map((event_date) => ({ event_date, event_time: "12:00", source_url: TBILL_PDF_URL }));
}

/** PIB Fixed Rate rows read "<when-issue-start> <auction-date> <settlement-date> <amounts...>" under the "PIB (Fixed Rate) Auction Calendar" heading specifically — the Floating Rate table earlier in the same document uses a different (2-date) row shape, so anchoring on the Fixed Rate heading avoids picking up its dates by mistake. */
export function parsePibAuctionPdfText(text: string): OfficialDate[] | null {
  const headingIndex = text.indexOf("PIB (Fixed Rate) Auction Calendar");
  const searchText = headingIndex === -1 ? text : text.slice(0, headingIndex);
  // Fixed Rate calendar block appears BEFORE its own heading label in this
  // document's reading order (the heading is a caption underneath, per the
  // confirmed extraction) — so the relevant rows are the 3-date lines
  // ("when-issue auction settlement amount target") found anywhere in the
  // fixed-rate section, distinguished from the floating-rate block's 2-date
  // rows by requiring three consecutive date tokens.
  const matches = [...searchText.matchAll(/(\d{1,2}-[A-Za-z]+-\d{2})\s+(\d{1,2}-[A-Za-z]+-\d{2})\s+(\d{1,2}-[A-Za-z]+-\d{2})\s+[\d,-]+\s+[\d,]/g)];
  const dates = matches.map((m) => parseSbpDateToken(m[2])).filter((d): d is string => d !== null);
  const unique = [...new Set(dates)];
  if (unique.length === 0) return null;
  return unique.map((event_date) => ({ event_date, event_time: "12:00", source_url: PIB_PDF_URL }));
}

export async function syncTbillAuctionCalendar(): Promise<OfficialDate[] | null> {
  const text = await fetchPdfText(TBILL_PDF_URL);
  if (!text) return null;
  return parseTbillAuctionPdfText(text);
}

export async function syncPibAuctionCalendar(): Promise<OfficialDate[] | null> {
  const text = await fetchPdfText(PIB_PDF_URL);
  if (!text) return null;
  return parsePibAuctionPdfText(text);
}

export interface ReconcileSummary {
  seriesSlug: string;
  status: "reconciled" | "skipped-fetch-or-parse-failed" | "error";
  detail: string;
}

function workerSecret(): string {
  const secret = process.env.NOTIFICATION_WORKER_SECRET;
  if (!secret) throw new Error("NOTIFICATION_WORKER_SECRET is not configured");
  return secret;
}

async function reconcile(seriesSlug: string, dates: OfficialDate[] | null): Promise<ReconcileSummary> {
  if (!dates || dates.length === 0) {
    return { seriesSlug, status: "skipped-fetch-or-parse-failed", detail: "Fetch or parse of the official source failed or returned nothing plausible — left existing data untouched." };
  }
  const supabase = createPublicDataClient();
  const { data, error } = await supabase.rpc("reconcile_official_calendar", {
    p_internal_secret: workerSecret(),
    p_series_slug: seriesSlug,
    p_official_dates: dates,
  });
  if (error) return { seriesSlug, status: "error", detail: error.message };
  return { seriesSlug, status: "reconciled", detail: JSON.stringify(data) };
}

/** Entry point called from the daily cron alongside syncAllFromSbpEasyData(). Fetches all four genuinely-machine-readable official calendars and reconciles each independently — one source failing (e.g. SBP's site being briefly down) never blocks the others. */
export async function syncOfficialCalendars(): Promise<ReconcileSummary[]> {
  const [{ mpc, report }, tbill, pib] = await Promise.all([syncMpcAndReportCalendar(), syncTbillAuctionCalendar(), syncPibAuctionCalendar()]);

  return Promise.all([
    reconcile("sbp-monetary-policy-committee-meeting", mpc),
    reconcile("sbp-monetary-policy-report", report),
    reconcile("treasury-bill-auction-3m", tbill),
    reconcile("treasury-bill-auction-6m", tbill),
    reconcile("treasury-bill-auction-12m", tbill),
    reconcile("pib-auction", pib),
  ]);
}
