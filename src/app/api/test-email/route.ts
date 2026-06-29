import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";

// TEMPORARY — exists only to manually verify the Resend integration
// delivers end-to-end (src/lib/email/resend.ts). Sends to a fixed address
// (not a query param) so this can't be used as an open relay to arbitrary
// recipients if it's ever hit unexpectedly. Delete this route once delivery
// is confirmed — it is not part of any real feature.
const TEST_RECIPIENT = "farzamarif786@gmail.com";

export async function GET() {
  const result = await sendEmail({
    to: TEST_RECIPIENT,
    subject: "Resend integration test — Pakistan Economic Intelligence",
    html: `
      <p>This is a test email confirming the Resend integration is working.</p>
      <p><strong>From:</strong> Pakistan Economic Intelligence &lt;alerts@pakeconintel.com&gt;</p>
      <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
    `,
    text: `This is a test email confirming the Resend integration is working.\nFrom: Pakistan Economic Intelligence <alerts@pakeconintel.com>\nSent at: ${new Date().toISOString()}`,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
