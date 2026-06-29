import { NextResponse } from "next/server";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { subscribeEmail } from "@/lib/notifications/subscribers";

// The Subscription Experience feature's public entry point — the only HTTP
// route that can trigger subscribeEmail() (which sends a real email via
// Resend), so it's the one genuinely new endpoint this feature needs.
// subscribe_email itself (the RPC) has no rate limiting of its own — it's
// a narrow, idempotent primitive, not a gatekeeper — so this route enforces
// it before ever calling through, via check_subscribe_rate_limit()
// (0015_subscribe_rate_limiting.sql): max 5 attempts per IP per 10
// minutes, max 1 attempt per email per 60 seconds. Both are durable
// (table-backed), not in-memory, since this runs across many independent
// Vercel serverless instances that share no memory.

interface RateLimitResult {
  allowed: boolean;
  reason?: "ip_rate_limited" | "email_cooldown";
  retry_after_seconds?: number;
}

function getClientIp(request: Request): string {
  // Vercel sets x-forwarded-for to "client, proxy1, proxy2..." — the first
  // entry is the original client. Falls back to a constant rather than a
  // per-request-random value so a missing header still groups requests
  // together under the rate limit instead of silently bypassing it.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  }

  const email = typeof (body as { email?: unknown })?.email === "string" ? (body as { email: string }).email.trim() : "";
  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ success: false, error: "invalid_email" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const supabase = createPublicDataClient();
  const { data: rateLimitData, error: rateLimitError } = await supabase.rpc("check_subscribe_rate_limit", { p_ip: ip, p_email: email });

  if (rateLimitError) {
    console.error(`[Subscribe] check_subscribe_rate_limit failed: ${rateLimitError.message}`);
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }

  const rateLimit = rateLimitData as RateLimitResult;
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: rateLimit.reason, retryAfterSeconds: rateLimit.retry_after_seconds },
      { status: 429, headers: rateLimit.retry_after_seconds ? { "Retry-After": String(rateLimit.retry_after_seconds) } : undefined },
    );
  }

  const result = await subscribeEmail(email, "economic-calendar-page");
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error ?? "subscribe_failed" }, { status: 400 });
  }

  return NextResponse.json({ success: true, alreadyVerified: result.alreadyVerified ?? false });
}
