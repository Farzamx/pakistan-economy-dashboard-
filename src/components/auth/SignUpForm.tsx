"use client";

import { useActionState } from "react";
import { signUp, type AuthActionResult } from "@/app/auth/actions";
import { useLanguage } from "@/components/LanguageProvider";

const INITIAL_STATE: AuthActionResult = { error: null };

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-neon-blue/50";

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, INITIAL_STATE);
  const { t } = useLanguage();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--text-secondary)]">{t("auth.email")}</span>
        <input type="email" name="email" required autoComplete="email" placeholder={t("auth.emailPlaceholder")} className={INPUT_CLASS} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--text-secondary)]">{t("auth.password")}</span>
        <input type="password" name="password" required autoComplete="new-password" minLength={8} placeholder={t("auth.atLeast8")} className={INPUT_CLASS} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--text-secondary)]">{t("auth.confirmPassword")}</span>
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
        {pending ? t("auth.creatingAccount") : t("auth.createAccountBtn")}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
        {t("auth.termsNote")}
      </p>
    </form>
  );
}
