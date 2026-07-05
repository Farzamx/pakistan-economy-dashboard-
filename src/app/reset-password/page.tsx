import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { T } from "@/components/T";

export const metadata: Metadata = {
  title: "Set New Password — Pakistan Economic Intelligence Center",
  description: "Set a new password for your Pakistan Economic Intelligence Center account.",
  robots: { index: false, follow: false },
};

// Reached only via the link in the password-reset email, after
// /auth/callback exchanges the code for a session — at that point the user
// is briefly authenticated specifically to set a new password, which is
// why this page has no "forgot password" link of its own.
export default function ResetPasswordPage() {
  return (
    <AuthShell title={<T tKey="auth.resetPasswordTitle" />} subtitle={<T tKey="auth.resetPasswordSubtitle" />}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
