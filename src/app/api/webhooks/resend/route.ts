import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";

// Resend webhook receiver — updates email_log (and, on bounce/complaint,
// subscribers) as delivery events arrive. Configure this URL
// (https://pakeconintel.com/api/webhooks/resend) in the Resend dashboard's
// Webhooks settings, which issues a signing secret to store as
// RESEND_WEBHOOK_SECRET (https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests).
//
// Signature verification (Svix, bundled in the resend SDK) is mandatory,
// not optional — without it, anyone who finds this URL could POST a fake
// "delivered" event for an arbitrary message id and corrupt delivery
// records. Every event is rejected unless it verifies.
//
// email.sent is intentionally a no-op here: record_email_batch_results
// already marks the row 'sent' synchronously at send time, from the
// worker's own request/response — this webhook only needs to carry the
// row forward into states the worker can't know about itself
// (delivered/bounced/complained/delivery_delayed/failed-after-acceptance).
// email.opened/email.clicked are also no-ops: engagement events, and
// overwriting a 'delivered' row's status with 'opened' would lose
// deliverability information for an engagement signal this MVP doesn't
// otherwise use.

const STATUS_BY_EVENT: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delivery_delayed",
  "email.failed": "failed",
};

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Webhooks/Resend] RESEND_WEBHOOK_SECRET is not configured — rejecting");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "missing_signature_headers" }, { status: 400 });
  }

  let event;
  try {
    // Resend's own client needs an API key to construct, but .webhooks.verify()
    // is a pure signature check — it never makes a network call, so reusing
    // RESEND_API_KEY here doesn't cost anything or risk anything beyond what
    // sending already does.
    const resend = new Resend(process.env.RESEND_API_KEY ?? "");
    event = resend.webhooks.verify({
      payload,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret,
    });
  } catch (err) {
    console.warn(`[Webhooks/Resend] Signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const newStatus = STATUS_BY_EVENT[event.type];
  if (!newStatus) {
    // email.sent / email.opened / email.clicked / anything else — no-op, see header.
    return NextResponse.json({ received: true, handled: false });
  }

  const emailId = "data" in event && "email_id" in event.data ? event.data.email_id : undefined;
  if (!emailId) {
    return NextResponse.json({ received: true, handled: false });
  }

  const statusDetail = event.type === "email.bounced" && "bounce" in event.data ? event.data.bounce?.message : undefined;

  const supabase = createPublicDataClient();
  const { data, error } = await supabase.rpc("update_email_delivery_status", {
    p_resend_message_id: emailId,
    p_status: newStatus,
    p_status_detail: statusDetail ?? null,
  });

  if (error) {
    console.error(`[Webhooks/Resend] update_email_delivery_status failed for ${emailId}: ${error.message}`);
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }

  const result = data as { success: boolean; error?: string };
  console.log(`[Webhooks/Resend] ${event.type} -> ${emailId}: ${result.success ? "updated" : result.error}`);
  return NextResponse.json({ received: true, handled: result.success });
}
