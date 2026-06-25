import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";

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

export default function SignUpPage() {
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
