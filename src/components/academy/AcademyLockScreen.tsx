"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

interface AcademyLockScreenProps {
  redirectAfterAuth: string;
}

export default function AcademyLockScreen({ redirectAfterAuth }: AcademyLockScreenProps) {
  const { t } = useLanguage();
  const encodedRedirect = encodeURIComponent(redirectAfterAuth);

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-8 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-3xl">
        🔒
      </div>
      <div className="max-w-sm space-y-2">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {t("academy.lockTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          {t("academy.lockDesc")}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`/signup?redirect=${encodedRedirect}`}
          className="rounded-lg bg-[var(--neon-blue)] px-5 py-2 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          {t("academy.createFreeAccount")}
        </Link>
        <Link
          href={`/login?redirect=${encodedRedirect}`}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
        >
          {t("academy.logIn")}
        </Link>
      </div>
    </div>
  );
}
