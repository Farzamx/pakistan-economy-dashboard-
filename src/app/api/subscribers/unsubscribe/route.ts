import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/notifications/subscribers";
import { renderConfirmationPage } from "@/lib/notifications/confirmationPage";
import { SITE_URL } from "@/lib/seoConfig";

const CALENDAR_URL = `${SITE_URL}/economic-calendar`;

// Landing page for the unsubscribe link embedded in every event-alert email
// (alertEmailTemplate.ts). GET, since this is a one-click link, not a form
// submission — matching the link it's served from.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return new NextResponse(
      renderConfirmationPage({ icon: "⚠️", title: "Invalid Link", message: "This unsubscribe link is missing its token.", success: false }),
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  const result = await unsubscribeByToken(token);

  if (!result.success) {
    return new NextResponse(
      renderConfirmationPage({
        icon: "⚠️",
        title: "Link Invalid",
        message: "This unsubscribe link is no longer valid.",
        success: false,
        buttonLabel: "Go to Economic Calendar",
        buttonHref: CALENDAR_URL,
      }),
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  // Idempotent either way (a fresh unsubscribe or clicking an already-used
  // link) — the end state is identical, so both show the same friendly
  // confirmation rather than distinguishing "already done" from "just did it."
  return new NextResponse(
    renderConfirmationPage({
      icon: "👋",
      title: "You've Been Unsubscribed",
      message: "We're sorry to see you go. You can subscribe again anytime.",
      success: true,
      buttonLabel: "Subscribe Again",
      buttonHref: CALENDAR_URL,
    }),
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
