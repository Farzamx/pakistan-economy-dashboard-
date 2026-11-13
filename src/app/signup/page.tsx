import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginRequiredNotice from "@/components/auth/LoginRequiredNotice";
import SignUpForm from "@/components/auth/SignUpForm";
import { T } from "@/components/T";
import { requiresLogin, safeRedirectPath } from "@/lib/accessPolicy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create Free Account — Pakistan Economic Intelligence Center",
  description: "Create a free account to open the Pakistan Economic Intelligence Center dashboards, indicators, workshops and tools.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function SignUpPage({ searchParams }: PageProps) {
  // Same fix as /login — bounce an already-authenticated visitor straight
  // back out (e.g. reached via Back button after logging in) rather than
  // showing the signup form again.
  const params = await searchParams;
  const redirectTo = safeRedirectPath(params.redirect);
  const loginRequired = params.redirect !== undefined && requiresLogin(redirectTo);
  const toLogin = params.redirect !== undefined ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(redirectTo);

  return (
    <AuthShell
      title={<T tKey="auth.signupTitle" />}
      subtitle={<T tKey="auth.signupSubtitle" />}
      footer={
        <>
          <T tKey="auth.haveAccountLink" />{" "}
          <Link href={toLogin} className="font-medium text-neon-blue hover:underline">
            <T tKey="common.login" />
          </Link>
        </>
      }
    >
      {loginRequired && <LoginRequiredNotice destination={redirectTo} />}
      <SignUpForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
