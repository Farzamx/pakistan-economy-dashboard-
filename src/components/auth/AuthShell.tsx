"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

interface AuthShellProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Shared centered-card layout for /login, /signup, /forgot-password, /reset-password */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const { t } = useLanguage();
  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="glow-blue flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple text-lg font-bold text-white">
            P
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white light:text-slate-900">{t("nav.logoName")}</p>
            <p className="text-xs text-white/40 light:text-slate-400">{t("nav.logoSubtitle")}</p>
          </div>
        </Link>

        <div className="glass-card rounded-2xl border-neon-blue/15 p-6 shadow-[0_0_40px_rgba(56,189,248,0.12)] sm:p-8">
          <h1 className="text-headline text-white light:text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-white/60 light:text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-sm text-white/50 light:text-slate-500">{footer}</div>}
      </div>
    </main>
  );
}
