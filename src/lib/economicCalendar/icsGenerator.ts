import type { EventRecord } from "./economicEventsRepo";
import { SITE_URL } from "@/lib/seoConfig";

// RFC 5545 iCalendar generation — Add-to-Calendar support (Phase 2A). Plain
// string building, no library: a VEVENT is a handful of required fields and
// pulling in a dependency for this would be more code than the generator
// itself.

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  // RFC 5545 §3.1: lines SHOULD be folded at 75 octets, continuation lines
  // start with a single space. Plain-ASCII content here, so .length is a
  // safe stand-in for octet count.
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

/** "20260722T140000" (no Z suffix) — events are timed in Pakistan Standard Time, fixed UTC+5, no DST to account for. */
function toIcsDateTime(eventDate: string, eventTime: string | null): string {
  const [y, m, d] = eventDate.split("-");
  const [h, min] = (eventTime ?? "00:00").split(":");
  return `${y}${m}${d}T${h.padStart(2, "0")}${min.padStart(2, "0")}00`;
}

const DEFAULT_DURATION_MINUTES = 60;

function addMinutes(dateTime: string, minutes: number): string {
  const y = Number(dateTime.slice(0, 4));
  const mo = Number(dateTime.slice(4, 6)) - 1;
  const d = Number(dateTime.slice(6, 8));
  const h = Number(dateTime.slice(9, 11));
  const mi = Number(dateTime.slice(11, 13));
  const date = new Date(y, mo, d, h, mi + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function buildVevent(event: EventRecord): string {
  const dtStart = toIcsDateTime(event.eventDate, event.eventTime);
  const dtEnd = addMinutes(dtStart, DEFAULT_DURATION_MINUTES);
  const url = `${SITE_URL}/economic-calendar/event/${event.slug}`;
  const descriptionParts = [event.description ?? event.series.description ?? "", event.previousValue ? `Previous: ${event.previousValue}` : null, event.forecastValue ? `Forecast: ${event.forecastValue}` : null, `Source: ${event.series.sourceName}`, url].filter(Boolean);

  return [
    "BEGIN:VEVENT",
    foldLine(`UID:${event.slug}@pakeconintel.com`),
    // PSX, the only "PKT" zone Pakistan uses, has no DST — TZID with a
    // floating local time is simpler and equally correct than VTIMEZONE.
    foldLine(`DTSTART;TZID=Asia/Karachi:${dtStart}`),
    foldLine(`DTEND;TZID=Asia/Karachi:${dtEnd}`),
    foldLine(`SUMMARY:${escapeIcsText(event.title)}`),
    foldLine(`DESCRIPTION:${escapeIcsText(descriptionParts.join("\n\n"))}`),
    foldLine(`URL:${url}`),
    foldLine(`CATEGORIES:${escapeIcsText(event.series.category)}`),
    "END:VEVENT",
  ].join("\r\n");
}

export function buildSingleEventIcs(event: EventRecord): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pakistan Economic Intelligence Center//Economic Calendar//EN",
    "CALSCALE:GREGORIAN",
    buildVevent(event),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function buildFeedIcs(events: EventRecord[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pakistan Economic Intelligence Center//Economic Calendar//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Pakistan Economic Calendar",
    "X-WR-CALDESC:Upcoming SBP, PBS, and Ministry of Finance economic releases from pakeconintel.com",
    ...events.map(buildVevent),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
