"use client";

import { useActionState } from "react";
import { updatePassword, type AuthActionResult } from "@/app/auth/actions";
import { useLanguage } from "@/components/LanguageProvider";

const INITIAL_STATE: AuthActionResult = { error: null };

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-neon-blue/50";

export default function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, INITIAL_STATE);
  const { t } = useLanguage();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--text-secondary)]">{t("auth.newPassword")}</span>
        <input type="password" name="password" required autoComplete="new-password" minLength={8} placeholder={t("auth.atLeast8")} className={INPUT_CLASS} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--text-secondary)]">{t("auth.confirmNewPassword")}</span>
        <input type="password" name="confirmPassword" required autoComplete="new-password" minLength={8} placeholder="••••••••" className={INPUT_CLASS} />
      </label>

      {state.error && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-neon-blue px-4 py-2.5 text-sm font-semibold text-[#05060f] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t("auth.updating") : t("auth.updatePasswordBtn")}
      </button>
    </form>
  );
}
