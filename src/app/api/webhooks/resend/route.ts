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
//
// Error handling contract: return 200 for every internal failure that
// occurs AFTER signature verification succeeds. Resend auto-disables the
// webhook endpoint after consecutive non-2xx responses, so internal
// errors (missing env vars, transient DB failures) must not propagate as
// 5xx. The only legitimate non-2xx is 401 for a bad signature (i.e., the
// request did not actually come from Resend).

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
    // Misconfigured server — return 200 so Resend does not count this as a
    // delivery failure and disable the webhook. The error is logged for ops.
    console.error("[Webhooks/Resend] RESEND_WEBHOOK_SECRET is not set — cannot verify; skipping");
    return NextResponse.json({ received: true, handled: false, error: "not_configured" });
  }

  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    // No Svix headers — reject; this request did not come from Resend.
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

  // --- Signature verified. From here on, always return 200. ---
  // Internal failures (missing env vars, DB errors) must not result in a
  // non-2xx response because Resend has no way to re-deliver this event
  // (it already considers it delivered once we receive it), and repeated
  // non-2xx responses will cause Resend to auto-disable the webhook.

  const newStatus = STATUS_BY_EVENT[event.type];
  if (!newStatus) {
    // email.sent / email.opened / email.clicked / anything else — no-op, see header.
    return NextResponse.json({ received: true, handled: false });
  }

  const emailId = "data" in event && "email_id" in event.data ? event.data.email_id : undefined;
  if (!emailId) {
    console.warn(`[Webhooks/Resend] ${event.type} event has no email_id — skipping DB update`);
    return NextResponse.json({ received: true, handled: false });
  }

  const statusDetail = event.type === "email.bounced" && "bounce" in event.data ? event.data.bounce?.message : undefined;

  const workerSecret = process.env.NOTIFICATION_WORKER_SECRET;
  if (!workerSecret) {
    console.error(`[Webhooks/Resend] NOTIFICATION_WORKER_SECRET is not set — cannot update ${emailId} to ${newStatus}`);
    return NextResponse.json({ received: true, handled: false, error: "worker_secret_not_configured" });
  }

  const supabase = createPublicDataClient();
  const { data, error } = await supabase.rpc("update_email_delivery_status", {
    p_internal_secret: workerSecret,
    p_resend_message_id: emailId,
    p_status: newStatus,
    p_status_detail: statusDetail ?? null,
  });

  if (error) {
    // Transient DB error — log it but return 200. Resend does not retry on
    // 200, so this event is lost for tracking purposes; that is preferable
    // to letting DB hiccups accumulate toward the auto-disable threshold.
    console.error(`[Webhooks/Resend] update_email_delivery_status failed for ${emailId}: ${error.message}`);
    return NextResponse.json({ received: true, handled: false, error: "db_error" });
  }

  const result = data as { success: boolean; error?: string };
  console.log(`[Webhooks/Resend] ${event.type} -> ${emailId}: ${result.success ? "updated" : result.error}`);
  return NextResponse.json({ received: true, handled: result.success });
}
