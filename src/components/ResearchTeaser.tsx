"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * The reference design's closing teaser row — three real destinations
 * (not fabricated article titles) in the reference's eyebrow-then-serif-
 * title format: the deeper risk analysis already on this page, the
 * Academy's learning content, and the Comparisons workspace.
 */
export default function ResearchTeaser() {
  const { t } = useLanguage();

  const items = [
    { eyebrow: t("nav.riskIntel"), title: t("researchTeaser.riskTitle"), href: "#risk-intelligence" },
    { eyebrow: t("nav.academy"), title: t("researchTeaser.academyTitle"), href: "/academy" },
    { eyebrow: t("nav.comparisons"), title: t("researchTeaser.comparisonsTitle"), href: "/comparisons" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="group">
          <p className="text-label text-white/40 light:text-slate-400">{item.eyebrow}</p>
          <p className="text-title mt-1.5 text-white transition-colors group-hover:text-neon-blue light:text-slate-900">
            {item.title}
          </p>
        </Link>
      ))}
    </div>
  );
}
