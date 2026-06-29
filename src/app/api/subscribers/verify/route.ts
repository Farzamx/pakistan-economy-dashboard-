import { NextResponse } from "next/server";
import { verifySubscriberToken } from "@/lib/notifications/subscribers";
import { renderConfirmationPage } from "@/lib/notifications/confirmationPage";

// Landing page for the link sent by subscribeEmail() in
// src/lib/notifications/subscribers.ts. GET (not POST) because this is
// opened directly by clicking a link in an email client/browser, not
// called programmatically.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return new NextResponse(
      renderConfirmationPage({ title: "Invalid link", message: "This verification link is missing its token.", success: false }),
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  const result = await verifySubscriberToken(token);

  if (!result.success) {
    return new NextResponse(
      renderConfirmationPage({
        title: "Link expired or invalid",
        message: "This verification link is no longer valid. If you'd like to subscribe, please request a new link.",
        success: false,
      }),
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  return new NextResponse(
    renderConfirmationPage({
      title: "You're subscribed!",
      message: "Your subscription to Pakistan Economic Calendar release alerts is confirmed. You'll receive an email whenever a tracked event is released.",
      success: true,
    }),
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
