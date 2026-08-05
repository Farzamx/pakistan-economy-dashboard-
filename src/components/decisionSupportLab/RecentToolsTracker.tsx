"use client";

// Mounted once, globally (same pattern as ProfileCompletionDrawer) — records
// a tool visit whenever the pathname lands on a real Decision Support Lab
// tool page, regardless of entry point (grid click, sidebar, direct URL).
// Renders nothing; ToolDirectory.tsx reads recordToolVisit's localStorage
// key on its own mount to build the "Recently used" row.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { DECISION_SUPPORT_TOOLS } from "@/lib/decisionSupportLab/tools";
import { recordToolVisit } from "@/lib/decisionSupportLab/recentTools";

export default function RecentToolsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !pathname.startsWith("/decision-support-lab/")) return;
    const slug = pathname.replace("/decision-support-lab/", "").split("/")[0];
    if (!slug) return;
    const tool = DECISION_SUPPORT_TOOLS.find((t) => t.id === slug);
    if (tool) recordToolVisit(tool.id);
  }, [pathname]);

  return null;
}
