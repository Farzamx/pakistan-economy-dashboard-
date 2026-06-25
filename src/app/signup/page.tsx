import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create Free Account — Pakistan Economic Intelligence Center",
  description: "Create a free account to access Comparisons, the Federal Budget Workshop, and the Provincial Budget Workshop.",
  robots: { index: false, follow: false },
};

const BENEFITS = [
  "Access Budget Workshops",
  "Compare Economic Indicators",
  "Provincial Budget Intelligence",
  "Save Preferences",
  "Future Premium Features",
];

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function SignUpPage({ searchParams }: PageProps) {
  // Same fix as /login — bounce an already-authenticated visitor straight
  // back out (e.g. reached via Back button after logging in) rather than
  // showing the signup form again.
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(params.redirect ?? "/");

  return (
    <AuthShell
      title="Create Free Account"
      subtitle="Unlock the full dashboard."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-neon-blue hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <ul className="mb-6 flex flex-col gap-2">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
            <span className="text-emerald-400">✓</span>
            {b}
          </li>
        ))}
      </ul>
      <SignUpForm />
    </AuthShell>
  );
}
