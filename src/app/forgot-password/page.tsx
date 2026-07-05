import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { T } from "@/components/T";

export const metadata: Metadata = {
  title: "Reset Password — Pakistan Economic Intelligence Center",
  description: "Request a password reset link for your Pakistan Economic Intelligence Center account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title={<T tKey="auth.forgotPasswordTitle" />}
      subtitle={<T tKey="auth.forgotPasswordSubtitle" />}
      footer={
        <Link href="/login" className="font-medium text-neon-blue hover:underline">
          <T tKey="auth.backToLoginLink" />
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
