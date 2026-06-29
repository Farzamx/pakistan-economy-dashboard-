// Subscriber lifecycle — thin wrappers around the subscribe_email /
// verify_subscriber / unsubscribe_subscriber RPCs (0007_notification_system.sql).
// All three tables they touch (subscribers, notification_jobs, email_log)
// have RLS enabled with zero policies — these SECURITY DEFINER functions
// are the only way in, by design (see that migration's header comment).
//
// Scope: backend primitives only. No subscribe-form UI or
// verify/unsubscribe HTTP routes are built yet — those are presentation-
// layer work nobody has asked for; this just makes the tables reachable
// for testing and for whatever UI comes later.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { sendEmail } from "@/lib/email/resend";
import { SITE_URL } from "@/lib/seoConfig";

interface SubscribeRpcResult {
  success: boolean;
  error?: string;
  already_verified?: boolean;
  verification_token?: string;
  subscriber_id?: string;
}

export interface SubscribeResult {
  success: boolean;
  alreadyVerified?: boolean;
  error?: string;
}

/** Creates (or re-issues a verification token for) a subscriber, then emails them a confirmation link. The subscriber row always exists after a successful call, regardless of whether the email send itself succeeds — a transient send failure delays the link, it doesn't lose the signup. */
export async function subscribeEmail(email: string, source?: string): Promise<SubscribeResult> {
  const supabase = createPublicDataClient();
  const { data, error } = await supabase.rpc("subscribe_email", { p_email: email, p_source: source ?? null });

  if (error) {
    console.error(`[Subscribers] subscribe_email RPC failed: ${error.message}`);
    return { success: false, error: error.message };
  }

  const result = data as SubscribeRpcResult;
  if (!result.success) return { success: false, error: result.error };
  if (result.already_verified) return { success: true, alreadyVerified: true };
  if (!result.verification_token) return { success: true }; // defensive — shouldn't happen if success=true and not already_verified

  const verifyUrl = `${SITE_URL}/api/subscribers/verify?token=${result.verification_token}`;
  await sendEmail({
    to: email,
    subject: "Confirm your subscription — Pakistan Economic Intelligence",
    html: `<p>Click below to confirm your subscription to Pakistan Economic Calendar release alerts.</p><p><a href="${verifyUrl}">Confirm subscription</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    text: `Confirm your subscription to Pakistan Economic Calendar release alerts:\n${verifyUrl}\n\nIf you didn't request this, you can ignore this email.`,
  });

  return { success: true };
}

interface SimpleRpcResult {
  success: boolean;
  error?: string;
  already_verified?: boolean;
  already_unsubscribed?: boolean;
}

export async function verifySubscriberToken(token: string): Promise<SimpleRpcResult> {
  const supabase = createPublicDataClient();
  const { data, error } = await supabase.rpc("verify_subscriber", { p_token: token });
  if (error) {
    console.error(`[Subscribers] verify_subscriber RPC failed: ${error.message}`);
    return { success: false, error: error.message };
  }
  return data as SimpleRpcResult;
}

export async function unsubscribeByToken(token: string): Promise<SimpleRpcResult> {
  const supabase = createPublicDataClient();
  const { data, error } = await supabase.rpc("unsubscribe_subscriber", { p_token: token });
  if (error) {
    console.error(`[Subscribers] unsubscribe_subscriber RPC failed: ${error.message}`);
    return { success: false, error: error.message };
  }
  return data as SimpleRpcResult;
}
