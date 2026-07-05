import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { T } from "@/components/T";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Log In — Pakistan Economic Intelligence Center",
  description: "Sign in to access Comparisons, the Federal Budget Workshop, and the Provincial Budget Workshop.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ redirect?: string; confirm?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect ?? "/";
  const confirmed = params.confirm === "1";

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
          <Link href="/signup" className="font-medium text-neon-blue hover:underline">
            <T tKey="auth.createOneLink" />
          </Link>
        </>
      }
    >
      <LoginForm redirectTo={redirectTo} confirmed={confirmed} />
    </AuthShell>
  );
}
