"use client";

// Shown on /login and /signup when a guest was sent here because they asked for a protected page (the URL carries ?redirect=<that page>): says plainly that
// signing in is required and which section they asked for. Nothing is shown for a plain visit to /login.

import { useLanguage } from "@/components/LanguageProvider";
import { navLinkForPath } from "@/lib/appNav";

export default function LoginRequiredNotice({ destination }: { destination: string }) {
  const { t } = useLanguage();
  const link = navLinkForPath(destination);
  const label = link ? (link.labelKey ? t(link.labelKey) : link.label) : null;

  return (
    <div role="note" data-testid="login-required-notice" className="mb-5 rounded-xl border border-neon-blue/25 bg-neon-blue/10 px-4 py-3 text-sm">
      <p className="font-semibold text-[var(--text-primary)]">{t("auth.loginRequiredTitle")}</p>
      <p className="mt-1 text-[var(--text-secondary)]">{t("auth.loginRequiredBody")}</p>
      {label && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {t("auth.loginRequiredFor")}: <span className="font-medium text-[var(--text-secondary)]">{label}</span>
        </p>
      )}
    </div>
  );
}
