"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function WhyEventsMatter() {
  const { t } = useLanguage();

  const topics = [
    { title: t("calendar.topic1Title"), body: t("calendar.topic1Body") },
    { title: t("calendar.topic2Title"), body: t("calendar.topic2Body") },
    { title: t("calendar.topic3Title"), body: t("calendar.topic3Body") },
    { title: t("calendar.topic4Title"), body: t("calendar.topic4Body") },
    { title: t("calendar.topic5Title"), body: t("calendar.topic5Body") },
  ];

  return (
    <section className="glass-card flex flex-col gap-5 rounded-2xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-semibold text-white light:text-slate-900">{t("calendar.whyMatters")}</h2>
        <p className="mt-1 text-sm text-white/50 light:text-slate-500">{t("calendar.whyMattersSubtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {topics.map((topic) => (
          <div key={topic.title} className="rounded-xl border border-white/5 light:border-slate-100 bg-white/[0.02] light:bg-slate-50 p-4">
            <p className="text-sm font-semibold text-white light:text-slate-900">{topic.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60 light:text-slate-600">{topic.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
