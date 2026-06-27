import { NextResponse } from "next/server";
import { getAllScheduledEvents } from "@/lib/economicCalendar/economicEventsRepo";
import { buildFeedIcs } from "@/lib/economicCalendar/icsGenerator";

/** Subscribable feed of every upcoming event — add this URL directly in Google Calendar/Apple Calendar/Outlook as a calendar subscription so it refreshes automatically, rather than downloading one event at a time. */
export async function GET() {
  const events = await getAllScheduledEvents();
  const ics = buildFeedIcs(events);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="pakistan-economic-calendar.ics"',
    },
  });
}
