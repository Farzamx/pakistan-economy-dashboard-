"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function ExpectedMarketFocus({ points }: { points: string[] }) {
  const { t } = useLanguage();
  if (points.length === 0) return null;
  return (
    <section className="glass-card mt-6 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("calendar.expectedFocus")}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-white/70 light:text-slate-600">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neon-blue" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}
