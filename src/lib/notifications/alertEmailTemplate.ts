import { formatEventDate, formatEventTime } from "@/lib/economicCalendar/economicCalendarData";
import { calculateSurprise } from "@/lib/economicCalendar/surpriseAnalysis";
import { getMarketReaction, hasMarketReactionRule } from "@/lib/economicCalendar/marketReactionEngine";
import { SITE_URL } from "@/lib/seoConfig";

// Release-alert email template — dark, table-based layout matching the
// dashboard's own "glass card" visual language (#05060f background,
// #0b0d18 cards, neon-blue/purple accents), built with inline styles plus
// one small @media block for mobile, since email clients don't support
// the Tailwind/flexbox the rest of this app uses. Deliberately concise: no
// AI-generated analysis, no long paragraphs — every interpretive sentence
// below is sourced verbatim from marketReactionEngine.ts's already-curated
// reaction text (existing, reviewed copy), never newly generated, per the
// explicit "do not fabricate explanations" requirement this was built to.

export interface AlertEmailEvent {
  slug: string;
  title: string;
  eventDate: string;
  eventTime: string | null;
  previousValue: string | null;
  forecastValue: string | null;
  actualValue: string | null;
  importance: "High" | "Medium" | "Low";
  category: string;
  seriesSlug: string;
  sourceName: string;
}

export interface AlertEmailNextEvent {
  title: string;
  eventDate: string;
  eventTime: string | null;
}

// Exported so the web UI's "Live Example" subscription preview
// (LiveEmailPreview.tsx) can render with the exact same badge colors as
// the real email, rather than maintaining a second, driftable copy.
export const IMPORTANCE_META: Record<AlertEmailEvent["importance"], { emoji: string; bg: string; text: string }> = {
  High: { emoji: "🔴", bg: "rgba(251,113,133,0.12)", text: "#fb7185" },
  Medium: { emoji: "🟡", bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  Low: { emoji: "🟢", bg: "rgba(52,211,153,0.12)", text: "#34d399" },
};

export const SURPRISE_META: Record<"positive" | "negative" | "in-line", { label: string; bg: string; text: string }> = {
  positive: { label: "Positive Surprise", bg: "rgba(52,211,153,0.12)", text: "#34d399" },
  negative: { label: "Negative Surprise", bg: "rgba(251,113,133,0.12)", text: "#fb7185" },
  "in-line": { label: "In Line", bg: "rgba(255,255,255,0.06)", text: "#9ca3af" },
};

/** One short, non-fabricated sentence — built entirely from marketReactionEngine.ts's existing curated headline+points (the same text used in the web UI's "Potential Market Reaction" section), never newly written. Returns null when no reaction rule applies (surprise unavailable, no dedicated rule for this series) — the caller omits the section entirely in that case, never falling back to a guess or to the generic FALLBACK_REACTION placeholder, which references a "Why It Matters" web section with no equivalent in an email. */
function buildInterpretation(event: AlertEmailEvent, surpriseDirection: "positive" | "negative" | "in-line" | "unavailable"): string | null {
  if (!hasMarketReactionRule(event.seriesSlug, event.category)) return null;
  const reaction = getMarketReaction(event.seriesSlug, event.category, surpriseDirection, event.actualValue, event.previousValue);
  if (!reaction) return null;
  const firstPoint = reaction.points[0];
  if (!firstPoint) return `${reaction.headline}.`;
  return `${reaction.headline} — ${firstPoint.charAt(0).toLowerCase()}${firstPoint.slice(1)}.`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildAlertEmailContent(event: AlertEmailEvent, nextEvent: AlertEmailNextEvent | null, unsubscribeToken: string): { subject: string; html: string; text: string } {
  const unsubscribeUrl = `${SITE_URL}/api/subscribers/unsubscribe?token=${unsubscribeToken}`;
  const eventUrl = `${SITE_URL}/economic-calendar/archive/${event.slug}`;
  const importance = IMPORTANCE_META[event.importance];
  const surprise = calculateSurprise(event.actualValue, event.forecastValue);
  // Called unconditionally, even when surprise is "unavailable" — Monetary
  // Policy's reaction comes from rate-change direction (previous vs
  // actual), not forecast surprise, so getMarketReaction's own
  // category-aware branching (not this surprise direction) decides what's
  // resolvable. Gating on surprise availability here would silently drop
  // every MPC interpretation whenever a future meeting has no forecast yet.
  const interpretation = buildInterpretation(event, surprise.direction);
  const showQuickComparison = event.previousValue !== null && event.actualValue !== null;
  const releaseTime = event.eventTime ? formatEventTime(event.eventTime) : null;

  const subject = event.actualValue ? `${event.title}: ${event.actualValue}` : `${event.title} — just released`;

  const dataRows: string[] = [
    `<td style="padding:14px 12px;background:rgba(255,255,255,0.03);border-radius:10px 0 0 10px;text-align:center;width:25%;">
      <p style="margin:0;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">Previous</p>
      <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#e5e7eb;">${escapeHtml(event.previousValue ?? "—")}</p>
    </td>`,
    `<td style="padding:14px 12px;background:rgba(255,255,255,0.03);text-align:center;width:25%;">
      <p style="margin:0;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">Expected</p>
      <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#e5e7eb;">${escapeHtml(event.forecastValue ?? "—")}</p>
    </td>`,
    `<td style="padding:14px 12px;background:rgba(56,189,248,0.1);border-radius:0 10px 10px 0;text-align:center;width:25%;">
      <p style="margin:0;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:#38bdf8;">Actual</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#38bdf8;">${escapeHtml(event.actualValue ?? "Pending")}</p>
    </td>`,
  ];

  // Shown whenever Expected exists (i.e. a surprise was computable at all),
  // including the "in line" case — a hold/in-line result is still useful
  // information ("nothing surprising happened"), not just the two
  // explicitly-colored positive/negative outcomes.
  const surpriseRow =
    surprise.direction !== "unavailable"
      ? `<tr><td style="padding:14px 32px 0;">
          <span style="display:inline-block;padding:6px 14px;border-radius:8px;font-size:13px;font-weight:700;background:${SURPRISE_META[surprise.direction].bg};color:${SURPRISE_META[surprise.direction].text};">
            Surprise: ${surprise.deltaLabel ? `${escapeHtml(surprise.deltaLabel)} &middot; ` : ""}${SURPRISE_META[surprise.direction].label}
          </span>
        </td></tr>`
      : "";

  const interpretationRow = interpretation
    ? `<tr><td style="padding:18px 32px 0;">
        <p style="margin:0;font-size:14px;line-height:1.55;color:#d1d5db;">${escapeHtml(interpretation)}</p>
      </td></tr>`
    : "";

  const quickComparisonRow = showQuickComparison
    ? `<tr><td style="padding:22px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;">
            <p style="margin:0;font-size:18px;font-weight:600;color:#9ca3af;">${escapeHtml(event.previousValue ?? "")}</p>
            <p style="margin:6px 0;font-size:16px;color:#4b5563;">&#8595;</p>
            <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">${escapeHtml(event.actualValue ?? "")}</p>
          </td></tr>
        </table>
      </td></tr>`
    : "";

  const nextEventRow = nextEvent
    ? `<tr><td style="padding:26px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.08);">
          <tr><td style="padding-top:18px;">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#6b7280;">Next Scheduled Release</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#e5e7eb;">${escapeHtml(nextEvent.title)}</p>
            <p style="margin:2px 0 0;font-size:13px;color:#9ca3af;">${formatEventDate(nextEvent.eventDate)}${nextEvent.eventTime ? ` · ${formatEventTime(nextEvent.eventTime)}` : ""}</p>
          </td></tr>
        </table>
      </td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
<style>
  @media only screen and (max-width: 480px) {
    .container { width: 100% !important; }
    .stat-table, .stat-table tr, .stat-table td { display: block !important; width: 100% !important; border-radius: 10px !important; margin-bottom: 6px; text-align: left !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#05060f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#05060f;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#0b0d18;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

<tr><td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.08);">
  <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.06em;color:#38bdf8;text-transform:uppercase;">&#127477;&#127472; Pakistan Economic Intelligence</p>
  <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#ffffff;">Economic Release Alert</p>
</td></tr>

<tr><td style="padding:24px 32px 0;">
  <span style="display:inline-block;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:700;background:${importance.bg};color:${importance.text};">${importance.emoji} ${event.importance} Market Impact</span>
  <h1 style="margin:14px 0 6px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">${escapeHtml(event.title)}</h1>
  <p style="margin:0;font-size:13px;color:#9ca3af;">${escapeHtml(event.sourceName)}${releaseTime ? ` &middot; ${releaseTime}` : ""}</p>
</td></tr>

<tr><td style="padding:20px 32px 0;">
  <table role="presentation" class="stat-table" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:3px 0;">
    <tr>${dataRows.join("")}</tr>
  </table>
</td></tr>

${surpriseRow}
${interpretationRow}
${quickComparisonRow}

<tr><td align="center" style="padding:30px 32px 8px;">
  <a href="${eventUrl}" style="display:inline-block;padding:14px 36px;background-color:#38bdf8;color:#05060f;font-weight:700;font-size:15px;text-decoration:none;border-radius:10px;">View Full Analysis</a>
</td></tr>

${nextEventRow}

<tr><td style="padding:28px 32px 30px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.08);">
    <tr><td style="padding-top:18px;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">Official Source: ${escapeHtml(event.sourceName)}</p>
      <p style="margin:0 0 14px;font-size:12px;color:#6b7280;">Pakistan Economic Intelligence</p>
      <p style="margin:0 0 12px;font-size:11px;line-height:1.5;color:#4b5563;">Official data sourced from SBP, PBS, and other government institutions.</p>
      <a href="${unsubscribeUrl}" style="font-size:12px;color:#6b7280;text-decoration:underline;">Unsubscribe from these alerts</a>
    </td></tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const textLines = [
    `${event.importance} Market Impact — ${event.title}`,
    `Source: ${event.sourceName}${releaseTime ? ` · ${releaseTime}` : ""}`,
    "",
    `Previous: ${event.previousValue ?? "—"}`,
    `Expected: ${event.forecastValue ?? "—"}`,
    `Actual: ${event.actualValue ?? "Pending"}`,
  ];
  if (surprise.direction !== "unavailable") textLines.push(`Surprise: ${surprise.deltaLabel ? `${surprise.deltaLabel} ` : ""}(${SURPRISE_META[surprise.direction].label})`);
  if (interpretation) textLines.push("", interpretation);
  textLines.push("", `View full analysis: ${eventUrl}`);
  if (nextEvent) textLines.push("", `Next Scheduled Release: ${nextEvent.title} — ${formatEventDate(nextEvent.eventDate)}${nextEvent.eventTime ? ` ${formatEventTime(nextEvent.eventTime)}` : ""}`);
  textLines.push("", `Unsubscribe: ${unsubscribeUrl}`);

  return { subject, html, text: textLines.join("\n") };
}
