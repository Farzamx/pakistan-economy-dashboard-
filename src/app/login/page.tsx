import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginRequiredNotice from "@/components/auth/LoginRequiredNotice";
import LoginForm, { type LoginNotice } from "@/components/auth/LoginForm";
import { T } from "@/components/T";
import { requiresLogin, safeRedirectPath } from "@/lib/accessPolicy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Log In — Pakistan Economic Intelligence Center",
  description: "Log in to open the Pakistan Economic Intelligence Center dashboards, indicators, workshops and tools.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ redirect?: string; confirm?: string; error?: string; reset?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  // Where to go after signing in. Only a path on this site is accepted (open-redirect guard); anything else falls back to the Overview.
  const redirectTo = safeRedirectPath(params.redirect);
  // The notice appears only when a guest was sent here from a protected page (not for a plain visit, and not for a redirect to an open page).
  const loginRequired = params.redirect !== undefined && requiresLogin(redirectTo);
  const toSignup = params.redirect !== undefined ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : "/signup";
  const confirmed = params.confirm === "1";
  // One notice at most, and only for the exact values the app itself sends (never the raw query text): a failed e-mail link, or a finished password change.
  const notice: LoginNotice = params.error === "auth-callback-failed" ? "callback-failed" : params.reset === "1" ? "password-updated" : null;

  // Found live during the authenticated-user navigation audit: pressing
  // Back after a successful login lands here (it's a real browser-history
  // entry from the original guest redirect) and showed the login form
  // again despite the user still being signed in. Bounce straight back out
  // instead — this is also why /login must stay a Server Component rather
  // than move this check client-side, since the stale form would otherwise
  // flash before any client-side redirect could fire.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(redirectTo);

  return (
    <AuthShell
      title={<T tKey="auth.welcomeBack" />}
      subtitle={<T tKey="auth.loginSubtitle" />}
      footer={
        <>
          <T tKey="auth.noAccountLink" />{" "}
          <Link href={toSignup} className="font-medium text-neon-blue hover:underline">
            <T tKey="auth.createOneLink" />
          </Link>
        </>
      }
    >
      {loginRequired && <LoginRequiredNotice destination={redirectTo} />}
      <LoginForm redirectTo={redirectTo} confirmed={confirmed} notice={notice} />
    </AuthShell>
  );
}
