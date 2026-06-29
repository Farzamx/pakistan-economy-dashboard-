import { NextResponse } from "next/server";
import { verifySubscriberToken } from "@/lib/notifications/subscribers";
import { renderConfirmationPage } from "@/lib/notifications/confirmationPage";
import { SITE_URL } from "@/lib/seoConfig";

const CALENDAR_URL = `${SITE_URL}/economic-calendar`;

// What a fresh subscriber will actually receive — kept in sync with
// SubscriptionSection.tsx's own TRACKED_EVENTS list by hand; both are
// short, human-curated lists of the calendar's real series, not generated
// from a shared constant, since this one is intentionally abbreviated
// ("and other important official releases") while the marketing page
// lists every series in full.
const ALERT_FEATURES = [
  "Monetary Policy Decisions",
  "CPI Inflation",
  "SPI Weekly Inflation",
  "Foreign Exchange Reserves",
  "Treasury Bill Auctions",
  "Current Account",
  "Worker Remittances",
  "Trade Balance",
  "And other important official releases",
];

function manageUrl(unsubscribeToken?: string): string {
  return unsubscribeToken ? `${SITE_URL}/subscriptions/manage?token=${unsubscribeToken}` : `${SITE_URL}/subscriptions/manage`;
}

// Landing page for the link sent by subscribeEmail() in
// src/lib/notifications/subscribers.ts. GET (not POST) because this is
// opened directly by clicking a link in an email client/browser, not
// called programmatically.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return new NextResponse(
      renderConfirmationPage({ icon: "⚠️", title: "Invalid Link", message: "This verification link is missing its token.", success: false }),
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  const result = await verifySubscriberToken(token);

  if (!result.success) {
    return new NextResponse(
      renderConfirmationPage({
        icon: "⚠️",
        title: "Link Expired or Invalid",
        message: "This verification link is no longer valid. If you'd like to subscribe, please request a new link from the Economic Calendar page.",
        success: false,
        buttonLabel: "Go to Economic Calendar",
        buttonHref: CALENDAR_URL,
      }),
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  if (result.already_verified) {
    return new NextResponse(
      renderConfirmationPage({
        icon: "✅",
        title: "You're Already Subscribed",
        message: "No further action is needed — you'll continue receiving notifications whenever important official Pakistan economic releases are published.",
        success: true,
        buttonLabel: "View Economic Calendar",
        buttonHref: CALENDAR_URL,
        secondaryButtonLabel: "Manage Subscription",
        secondaryButtonHref: manageUrl(result.unsubscribe_token),
      }),
      { status: 200, headers: { "Content-Type": "text/html" } },
    );
  }

  return new NextResponse(
    renderConfirmationPage({
      icon: "✅",
      title: "Subscription Confirmed",
      subtitle: "Welcome to Pakistan Economic Intelligence Alerts",
      message: "You'll now receive official Pakistan economic releases as soon as they're published, including major market-moving events such as:",
      features: ALERT_FEATURES,
      success: true,
      buttonLabel: "View Economic Calendar",
      buttonHref: CALENDAR_URL,
      secondaryButtonLabel: "Manage Subscription",
      secondaryButtonHref: manageUrl(result.unsubscribe_token),
    }),
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
