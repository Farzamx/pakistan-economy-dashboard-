"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";

type Phase = "form" | "success" | "already-verified";
type FormStatus = "idle" | "submitting" | "error";
type ResendStatus = "idle" | "sending" | "sent" | "error";

interface ErrorInfo {
  message: string;
  retryAfterSeconds?: number;
}

interface SubscribeResponse {
  success: boolean;
  alreadyVerified?: boolean;
  error?: string;
  retryAfterSeconds?: number;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "That doesn't look like a valid email address.",
  ip_rate_limited: "Too many attempts from this connection. Please try again in a few minutes.",
  email_cooldown: "A verification email was just sent to this address. Please check your inbox before requesting another.",
  server_error: "Something went wrong on our end. Please try again shortly.",
  subscribe_failed: "We couldn't process that subscription. Please try again.",
};

function describeError(data: Partial<SubscribeResponse>): ErrorInfo {
  const code = data.error ?? "subscribe_failed";
  return { message: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.subscribe_failed, retryAfterSeconds: data.retryAfterSeconds };
}

function formatRetry(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return ` (try again in about ${minutes} minute${minutes > 1 ? "s" : ""})`;
}

const phaseTransition = { duration: 0.35, ease: "easeOut" as const };

/**
 * The interactive half of the Subscription Experience — talks to the one
 * new endpoint this feature needed, POST /api/subscribers/subscribe
 * (rate-limited server-side; see that route and
 * 0015_subscribe_rate_limiting.sql). No client accounts, no preferences —
 * an email address is the entire signup surface.
 *
 * `phase` and the form/resend statuses are deliberately separate state:
 * once a submission succeeds, `phase` moves to "success" (or
 * "already-verified") and STAYS there — a later "Resend" click only
 * toggles `resendStatus`, so the success screen never flips back to
 * showing the email input while a resend is in flight.
 */
export default function SubscriptionForm() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [formError, setFormError] = useState<ErrorInfo | null>(null);
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");
  const [resendError, setResendError] = useState<ErrorInfo | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const inFlight = useRef(false);
  const inputId = useId();
  const errorId = useId();
  const prefersReducedMotion = useSafeReducedMotion();

  async function postSubscribe(targetEmail: string): Promise<{ ok: true; alreadyVerified: boolean } | { ok: false; error: ErrorInfo }> {
    try {
      const res = await fetch("/api/subscribers/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data: SubscribeResponse = await res.json();
      if (!res.ok || !data.success) return { ok: false, error: describeError(data) };
      return { ok: true, alreadyVerified: data.alreadyVerified ?? false };
    } catch {
      return { ok: false, error: { message: "Couldn't reach the server. Please check your connection and try again." } };
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return; // belt-and-suspenders against double-submit beyond the disabled button
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setFormStatus("error");
      setFormError({ message: ERROR_MESSAGES.invalid_email });
      return;
    }

    inFlight.current = true;
    setFormStatus("submitting");
    setFormError(null);

    postSubscribe(trimmed).then((result) => {
      inFlight.current = false;
      if (!result.ok) {
        setFormStatus("error");
        setFormError(result.error);
        return;
      }
      setSubmittedEmail(trimmed);
      setFormStatus("idle");
      setPhase(result.alreadyVerified ? "already-verified" : "success");
    });
  }

  function handleResend() {
    if (resendStatus === "sending") return;
    setResendStatus("sending");
    setResendError(null);
    postSubscribe(submittedEmail).then((result) => {
      if (!result.ok) {
        setResendStatus("error");
        setResendError(result.error);
        return;
      }
      setResendStatus("sent");
    });
  }

  function handleChangeEmail() {
    setPhase("form");
    setFormStatus("idle");
    setFormError(null);
    setResendStatus("idle");
    setResendError(null);
    setSubmittedEmail("");
  }

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: phaseTransition,
      };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {phase === "success" || phase === "already-verified" ? (
        <motion.div key="result" {...animProps} className="flex flex-col gap-4 text-center" role="status" aria-live="polite">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-400/10 text-3xl" aria-hidden="true">
            {phase === "already-verified" ? "✅" : "📩"}
          </div>
          {phase === "already-verified" ? (
            <>
              <h3 className="text-lg font-semibold text-white">You&apos;re already subscribed</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                <span className="font-medium text-slate-200">{submittedEmail}</span> is already receiving official Pakistan economic releases. No further action is needed.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-white">Check your inbox</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                We&apos;ve sent a verification email to <span className="font-medium text-slate-200">{submittedEmail}</span>. Verify your address to begin receiving official Pakistan Economic Calendar alerts.
              </p>
            </>
          )}

          {phase === "success" && (
            <div aria-live="polite">
              {resendStatus === "sent" && <p className="text-sm text-emerald-400">Verification email resent — please check your inbox.</p>}
              {resendStatus === "error" && resendError && (
                <p role="alert" className="text-sm text-rose-400">
                  {resendError.message}
                  {resendError.retryAfterSeconds ? formatRetry(resendError.retryAfterSeconds) : ""}
                </p>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {phase === "success" && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendStatus === "sending"}
                aria-busy={resendStatus === "sending"}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendStatus === "sending" ? "Resending…" : "Resend verification email"}
              </button>
            )}
            <button
              type="button"
              onClick={handleChangeEmail}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              Change email
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div key="form" {...animProps} className="flex flex-col gap-3">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            <label htmlFor={inputId} className="sr-only">
              Email address
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id={inputId}
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={formStatus === "error"}
                aria-describedby={formStatus === "error" ? errorId : undefined}
                disabled={formStatus === "submitting"}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white placeholder:text-slate-500 outline-none transition-colors focus-visible:border-sky-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={formStatus === "submitting"}
                aria-busy={formStatus === "submitting"}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-400 px-7 py-3.5 text-base font-semibold text-slate-950 transition-colors hover:bg-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              >
                {formStatus === "submitting" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" aria-hidden="true" />}
                {formStatus === "submitting" ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
            {formStatus === "error" && formError && (
              <p id={errorId} role="alert" className="text-sm text-rose-400">
                {formError.message}
                {formError.retryAfterSeconds ? formatRetry(formError.retryAfterSeconds) : ""}
              </p>
            )}
          </form>

          <p className="text-center text-[11px] leading-relaxed text-slate-500">
            We never sell your email · One-click unsubscribe anytime · Official economic releases only
          </p>

          <p className="text-center text-xs text-slate-500">
            Already subscribed?{" "}
            <Link href="/subscriptions/manage" className="font-medium text-sky-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 rounded">
              Manage your subscription
            </Link>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
