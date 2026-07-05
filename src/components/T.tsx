"use client";

import { useLanguage } from "@/components/LanguageProvider";

/** Thin client wrapper that resolves a translation key — safe to render from RSC pages. */
export function T({ tKey }: { tKey: string }) {
  const { t } = useLanguage();
  return <>{t(tKey)}</>;
}
