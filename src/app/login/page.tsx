import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

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

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue to your dashboard."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-neon-blue hover:underline">
            Create one free
          </Link>
        </>
      }
    >
      <LoginForm redirectTo={redirectTo} confirmed={confirmed} />
    </AuthShell>
  );
}
