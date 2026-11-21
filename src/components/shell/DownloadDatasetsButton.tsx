"use client";

// The header's "Download Datasets" shortcut: one compact button, always in the sticky bar, so the existing Download Datasets page is a click away from any
// page (before, the only routes there were the Tools menu and links inside some indicator pages).
//
// It is a plain link to the one existing page; nothing is duplicated and no route, file or API changes. Access is unchanged: it goes through the same
// guest gate as every other protected link in the header, so a signed-out visitor gets the usual sign-in dialog (which carries the destination through
// log-in), and src/proxy.ts remains the real gate for a direct visit.
//
// Width is the only thing that changes with the viewport: icon + label from 1280px (xl) and from 640px (sm) up to the point the desktop bar needs the room
// (1023px); icon only in between (1024-1279px, where the full navigation and the inline search share the row) and on phones. The accessible name and
// tooltip are the full label at every width.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { DOWNLOAD_DATASETS_PATH } from "@/lib/appNav";

export default function DownloadDatasetsButton({ onLinkClick }: { onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => boolean | void }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const label = t("appNav.downloadDatasets");
  const current = pathname === DOWNLOAD_DATASETS_PATH;

  return (
    <Link
      href={DOWNLOAD_DATASETS_PATH}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      title={label}
      data-download-datasets-shortcut
      onClick={(e) => onLinkClick(e, DOWNLOAD_DATASETS_PATH)}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--pe-radius)] border border-pe-nav-border text-[14px] font-medium text-pe-nav-text transition-colors hover:bg-pe-nav-raised sm:w-auto sm:px-3 lg:w-9 lg:px-0 xl:w-auto xl:px-3 ${
        current ? "bg-pe-nav-raised" : ""
      }`}
    >
      <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 20h14" />
      </svg>
      <span className="hidden sm:inline lg:hidden xl:inline">{label}</span>
    </Link>
  );
}
