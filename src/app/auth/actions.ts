"use server";

// Server Functions backing the /login, /signup, and /forgot-password forms.
// Each returns a plain { error } result for useActionState rather than
// throwing — these are expected user-facing outcomes (wrong password,
// email already registered), not exceptions. Redirects on success happen
// here via next/navigation's redirect(), which throws internally; that's
// the one case where Next expects an exception to propagate.

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { AFTER_AUTH_COOKIE, safeRedirectPath } from "@/lib/accessPolicy";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionResult {
  error: string | null;
  /** Only meaningful for actions that don't redirect on success (requestPasswordReset) — lets the form switch to a confirmation message without relying on object-reference tricks to detect "submitted". */
  success?: boolean;
}

/** The app's own origin, derived from the incoming request rather than a hardcoded env var — so email confirmation/reset links work correctly in local dev, Vercel previews, and production without separate configuration per environment. */
async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function signIn(_prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  // The form field is client-controlled: only a path on this site is followed (open-redirect guard).
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect(redirectTo);
}

export async function signUp(_prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  // The page the new member was trying to open. The confirmation e-mail is opened later (often on another tab), so it is remembered in a short-lived
  // cookie that /auth/callback reads, instead of changing the e-mail link (which Supabase checks against its allowed redirect URLs).
  const destination = safeRedirectPath(formData.get("redirectTo"));
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) return { error: error.message };

  const jar = await cookies();
  jar.set(AFTER_AUTH_COOKIE, destination, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
  redirect(`/login?confirm=1&redirect=${encodeURIComponent(destination)}`);
}

export async function requestPasswordReset(_prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "");

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Deliberately returns the same success state whether or not the email
  // exists in the system — confirming non-existence here would let anyone
  // enumerate registered emails through this form.
  if (error) return { error: error.message };

  return { error: null, success: true };
}

export async function updatePassword(_prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  // The reset link signed the member in only so they could choose a new password. End that session (everywhere) and send them to the login page, which confirms
  // the change and asks for the new password; a signed-in member would otherwise be bounced straight past the confirmation.
  await supabase.auth.signOut();
  redirect("/login?reset=1");
}

// Deliberately does not call redirect() itself: this action is invoked
// directly from a Client Component event handler (Sidebar's "Log Out"
// button), not as a <form action>. Calling redirect() from a directly-
// invoked Server Function still works in most cases, but mixing it with
// the caller's own router.push/refresh afterward risks a race between two
// navigations — simpler and more predictable to let the one caller fully
// own navigation after awaiting this.
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
