import { NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/economicCalendar/economicEventsRepo";
import { buildSingleEventIcs } from "@/lib/economicCalendar/icsGenerator";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return new NextResponse("Not found", { status: 404 });

  const ics = buildSingleEventIcs(event);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
    },
  });
}
