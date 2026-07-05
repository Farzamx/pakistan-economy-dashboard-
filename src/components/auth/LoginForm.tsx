"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthActionResult } from "@/app/auth/actions";
import { useLanguage } from "@/components/LanguageProvider";

const INITIAL_STATE: AuthActionResult = { error: null };

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-neon-blue/50";

export default function LoginForm({ redirectTo, confirmed }: { redirectTo: string; confirmed: boolean }) {
  const [state, formAction, pending] = useActionState(signIn, INITIAL_STATE);
  const { t } = useLanguage();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {confirmed && (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
          {t("auth.accountCreated")}
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--text-secondary)]">{t("auth.email")}</span>
        <input type="email" name="email" required autoComplete="email" placeholder={t("auth.emailPlaceholder")} className={INPUT_CLASS} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--text-secondary)]">{t("auth.password")}</span>
        <input type="password" name="password" required autoComplete="current-password" placeholder="••••••••" className={INPUT_CLASS} />
      </label>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs text-neon-blue hover:underline">
          {t("auth.forgotPassword")}
        </Link>
      </div>

      {state.error && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-neon-blue px-4 py-2.5 text-sm font-semibold text-[#05060f] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t("auth.signingIn") : t("auth.logInBtn")}
      </button>
    </form>
  );
}
