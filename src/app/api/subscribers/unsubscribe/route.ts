import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/notifications/subscribers";
import { renderConfirmationPage } from "@/lib/notifications/confirmationPage";

// Landing page for the unsubscribe link embedded in every event-alert email
// (notificationJobWorker.ts's buildAlertEmailContent). GET, since this is a
// one-click link, not a form submission — matching the link it's served
// from.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return new NextResponse(
      renderConfirmationPage({ title: "Invalid link", message: "This unsubscribe link is missing its token.", success: false }),
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  const result = await unsubscribeByToken(token);

  if (!result.success) {
    return new NextResponse(
      renderConfirmationPage({
        title: "Link invalid",
        message: "This unsubscribe link is no longer valid.",
        success: false,
      }),
      { status: 400, headers: { "Content-Type": "text/html" } },
    );
  }

  return new NextResponse(
    renderConfirmationPage({
      title: "You've been unsubscribed",
      message: "You will no longer receive Pakistan Economic Calendar release alerts.",
      success: true,
    }),
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}
