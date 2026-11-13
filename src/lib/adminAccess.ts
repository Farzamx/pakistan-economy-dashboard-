// Who may open the administrator pages (/admin/system-health, /admin/sync-status). ONE place, used by both pages.
//
// Three things must ALL be true (G.23):
//   1. the visitor is a signed-in Supabase user (checked with the Auth server, not read from a cookie);
//   2. that user's e-mail address is CONFIRMED (email_confirmed_at is set);
//   3. that user's id equals the server-side ADMIN_USER_ID.
// The id is what identifies the administrator. An e-mail address is only what someone typed at sign-up (and, while Supabase's "Confirm email" is off, it is
// not even verified), so it is never used to grant access: ADMIN_EMAIL is still used elsewhere (the watchdog's alert recipient) but not here.
//
// Outcomes: a guest is sent to the login page; anyone else who fails a check gets the ordinary not-found page (the same response as any unknown URL, so the pages'
// existence is not advertised). The check FAILS CLOSED: if ADMIN_USER_ID is unset or is not a UUID, nobody is an administrator.
//
// ADMIN_USER_ID is a plain server environment variable (never NEXT_PUBLIC_*), read only here at request time, so it is never inlined into client code; this module
// must not be imported from a "use client" file (a test enforces that). Neither the id nor the reason a check failed is logged or returned to the browser.

import { timingSafeEqual } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { loginUrlFor } from "@/lib/accessPolicy";
import { createClient } from "@/lib/supabase/server";

/** The parts of a Supabase user this check reads. */
export interface AdminCandidate {
  id?: string | null;
  email?: string | null;
  email_confirmed_at?: string | null;
}

export type AdminDecision =
  | { outcome: "guest" }
  | { outcome: "denied"; reason: "not-configured" | "not-administrator" | "email-unconfirmed" }
  | { outcome: "allowed" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The configured administrator id, normalised, or null when it is unset or malformed. */
export function configuredAdminUserId(raw: string | undefined = process.env.ADMIN_USER_ID): string | null {
  const v = raw?.trim().toLowerCase();
  return v && UUID.test(v) ? v : null;
}

function sameId(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase());
  const y = Buffer.from(b.toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The pure decision (no I/O): used by requireAdmin and tested exhaustively. */
export function decideAdminAccess(user: AdminCandidate | null | undefined, adminUserId: string | null = configuredAdminUserId()): AdminDecision {
  if (!user) return { outcome: "guest" };
  if (!adminUserId) return { outcome: "denied", reason: "not-configured" };
  if (typeof user.id !== "string" || !sameId(user.id, adminUserId)) return { outcome: "denied", reason: "not-administrator" };
  if (!user.email || !user.email_confirmed_at) return { outcome: "denied", reason: "email-unconfirmed" };
  return { outcome: "allowed" };
}

/**
 * Call first in an administrator page. Returns only for the confirmed administrator; otherwise it redirects a guest to /login?redirect=<path> or throws the
 * ordinary not-found. `path` is the page's own path (for the return trip after signing in). Returns the administrator's own e-mail address, which a page may
 * show to that administrator (never the id).
 */
export async function requireAdmin(path: string): Promise<{ email: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const decision = decideAdminAccess(user);
  if (decision.outcome === "guest") redirect(loginUrlFor(path));
  if (decision.outcome === "denied") notFound();
  return { email: user?.email ?? "" };
}
