// Reusable email service — thin wrapper around the Resend SDK so callers
// never construct a Resend client or touch RESEND_API_KEY directly.
//
// Lazily constructed (not at module load) so importing this file never
// throws in an environment where RESEND_API_KEY isn't set yet (e.g. local
// dev before the key is configured) — the error only surfaces when an
// email is actually attempted, with a clear message instead of a crash at
// import time.
//
// Two primitives: sendEmail() for one-off sends (verification, unsubscribe
// confirmation, the manual test route), and sendEmailBatch() for the
// notification job worker's bulk event-alert sends. Templates/HTML for
// specific notification types live in src/lib/notifications/, not here —
// this file only knows how to talk to Resend.

import { Resend } from "resend";

const FROM_NAME = "Pakistan Economic Intelligence";
const FROM_EMAIL = "alerts@pakeconintel.com";
const DEFAULT_REPLY_TO = "farzamarif786@gmail.com";

let cachedClient: Resend | null = null;

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text fallback. Optional, but recommended for deliverability/spam scoring. */
  text?: string;
  /** Defaults to DEFAULT_REPLY_TO — pass an explicit value only to override it for a specific send. */
  replyTo?: string | string[];
}

export interface SendEmailResult {
  success: boolean;
  /** Resend's message id, present only on success — useful for looking the send up in the Resend dashboard. */
  id?: string;
  error?: string;
}

/**
 * Sends an email via Resend from alerts@pakeconintel.com, displayed as
 * "Pakistan Economic Intelligence". Never throws — failures (missing API
 * key, Resend API error, network error) are returned as
 * `{ success: false, error }` so callers can decide how to surface that,
 * rather than every call site needing its own try/catch.
 */
export async function sendEmail(params: SendEmailParams, idempotencyKey?: string): Promise<SendEmailResult> {
  try {
    const resend = getClient();
    const { data, error } = await resend.emails.send(
      {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: params.to,
        replyTo: params.replyTo ?? DEFAULT_REPLY_TO,
        subject: params.subject,
        html: params.html,
        text: params.text,
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    if (error) {
      console.error(`[Email] Send failed: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Sent — id=${data?.id} to=${Array.isArray(params.to) ? params.to.join(",") : params.to}`);
    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Email] Send failed: ${message}`);
    return { success: false, error: message };
  }
}

export interface BatchEmailItem {
  /** Caller's own correlation key (e.g. an email_log row id) — returned alongside the result so callers never have to rely on array-position correlation. */
  key: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
}

export interface BatchEmailItemResult {
  key: string;
  success: boolean;
  id?: string;
  error?: string;
}

const RATE_LIMIT_RETRY_DELAYS_MS = [1000, 2000]; // 2 retries, doubling — rate limits clear on their own within a couple seconds, unlike data errors

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends up to 100 personalized emails in one Resend batch call — roughly
 * 100x the throughput of individual sends against Resend's 5 req/sec
 * account-wide rate limit, which is what makes "tens of thousands of
 * subscribers" tractable at all within a serverless function's time budget.
 *
 * Uses Resend's default (strict) batch validation: the whole call either
 * fully succeeds (one id per item, same order as submitted — there is no
 * partial-success shape in strict mode, confirmed by the SDK's response
 * type) or fully fails. A whole-batch failure is handled two different
 * ways depending on *why* it failed:
 *   - rate_limit_exceeded: the batch itself was fine, the account is just
 *     over the 5 req/sec ceiling momentarily — retry the SAME batch after
 *     a short backoff, since falling back to 100 individual sends would
 *     hit the exact same rate limit immediately, just slower.
 *   - anything else (e.g. one malformed recipient): retrying the same
 *     batch would fail identically — fall back to sending every item
 *     individually instead, so the other 99 valid emails still go out and
 *     only the genuinely bad one is recorded as failed. Guessing which
 *     one was bad and skipping it would risk a wrong success/fail
 *     attribution, which corrupts notification_jobs' counters.
 */
export async function sendEmailBatch(items: BatchEmailItem[], batchIdempotencyKey?: string): Promise<BatchEmailItemResult[]> {
  if (items.length === 0) return [];
  if (items.length > 100) {
    throw new Error(`sendEmailBatch: received ${items.length} items, exceeds Resend's 100-per-call batch limit`);
  }

  for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const resend = getClient();
      const { data, error } = await resend.batch.send(
        items.map((item) => ({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: item.to,
          replyTo: item.replyTo ?? DEFAULT_REPLY_TO,
          subject: item.subject,
          html: item.html,
          text: item.text,
        })),
        batchIdempotencyKey ? { idempotencyKey: batchIdempotencyKey } : undefined,
      );

      if (error) {
        if (error.name === "rate_limit_exceeded" && attempt < RATE_LIMIT_RETRY_DELAYS_MS.length) {
          const delay = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
          console.warn(`[Email] Batch rate-limited (${items.length} emails) — retrying in ${delay}ms`);
          await sleep(delay);
          continue;
        }
        console.warn(`[Email] Batch send failed (${items.length} emails): ${error.message} — falling back to individual sends`);
        return await sendIndividually(items);
      }

      console.log(`[Email] Batch sent — ${data?.data.length ?? 0}/${items.length} ids returned`);
      return items.map((item, i) => ({ key: item.key, success: true, id: data?.data[i]?.id }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Email] Batch send threw (${items.length} emails): ${message} — falling back to individual sends`);
      return await sendIndividually(items);
    }
  }

  // Exhausted rate-limit retries — last resort, same reasoning as above:
  // individual sends will likely also hit the same limit, but at least each
  // one is recorded accurately as it does or doesn't succeed.
  return await sendIndividually(items);
}

async function sendIndividually(items: BatchEmailItem[]): Promise<BatchEmailItemResult[]> {
  const results: BatchEmailItemResult[] = [];
  for (const item of items) {
    const result = await sendEmail({ to: item.to, subject: item.subject, html: item.html, text: item.text, replyTo: item.replyTo });
    results.push({ key: item.key, success: result.success, id: result.id, error: result.error });
  }
  return results;
}
