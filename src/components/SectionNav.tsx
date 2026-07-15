"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export interface SectionNavItem {
  key: string;
  id: string;
}

interface Props {
  items: SectionNavItem[];
}

/**
 * Horizontal in-page section navigation (PEIC v3 navigation pass) —
 * restores the quick-jump capability the old Sidebar's Main/Analytics
 * anchor list used to provide before primary nav moved to TopNav, as a
 * sticky bar under the Market Ribbon instead of a sidebar list. Same
 * IntersectionObserver scroll-spy approach the old Sidebar used.
 */
export default function SectionNav({ items }: Props) {
  const { t } = useLanguage();
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const ids = items.map((item) => item.id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        for (let i = ids.length - 1; i >= 0; i--) {
          if (visible.has(ids[i])) {
            setActiveId(ids[i]);
            break;
          }
        }
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav
      aria-label="Section navigation"
      className="sticky top-[47px] z-10 flex items-center gap-6 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--background)]/95 px-6 py-2.5 backdrop-blur-xl hide-scrollbar sm:top-[111px] sm:px-10 lg:px-16"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={(e) => handleClick(e, item.id)}
          aria-current={activeId === item.id ? "true" : undefined}
          className={`shrink-0 whitespace-nowrap text-xs font-medium transition-colors ${
            activeId === item.id ? "text-neon-blue" : "text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900"
          }`}
        >
          {t(`nav.${item.key}`)}
        </a>
      ))}
    </nav>
  );
}
