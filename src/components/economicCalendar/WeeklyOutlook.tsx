"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function WeeklyOutlook({ outlook }: { outlook: string }) {
  const { t } = useLanguage();
  return (
    <section className="glass-card flex flex-col gap-3 rounded-2xl border-neon-blue/20 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("calendar.weeklyOutlookTitle")}</h2>
      <p className="text-sm leading-relaxed text-white/70 light:text-slate-600">{outlook}</p>
    </section>
  );
}
