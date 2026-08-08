"use client";

// The app's chrome (nav bars, ambient background, floating widgets) plus
// its entire provider stack (Auth/Language/Preferences/Sidebar/Theme) used
// to render unconditionally in the root layout, because every route was
// part of the same authenticated-feeling product. Now that "/", "/home",
// "/about", "/contact" and "/methodology" are a separate public marketing
// site (see the routing change that moved the dashboard from "/" to
// "/overview"), those routes need none of it — no auth state, no i18n, no
// preferences, no sidebar, and their own hardcoded theme. ("/home" renders
// the identical landing page as "/" — see src/proxy.ts's returning-visitor
// routing and src/app/home/page.tsx.)
//
// AppShell (the providers + chrome) is loaded via next/dynamic rather than
// a static import specifically so it becomes its own code-split chunk that
// marketing routes never fetch — a plain runtime `if` with a static import
// would still bundle all of it into this file's chunk regardless of which
// branch executes. Measured: this was the actual fix for the marketing
// page's mobile LCP coming in over budget (see AppShell.tsx's header for
// the full story) — the provider stack alone was several hundred KB the
// marketing page had no use for.
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import MotionProvider from "@/components/MotionProvider";

const AppShell = dynamic(() => import("@/components/AppShell"));

const MARKETING_PATHS = new Set(["/", "/home", "/about", "/contact", "/methodology"]);

export default function ConditionalAppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (MARKETING_PATHS.has(pathname)) {
    // MotionProvider carries no visible chrome and no heavy dependency
    // beyond framer-motion (already used below the fold elsewhere in the
    // app) — kept so any below-the-fold marketing animation still respects
    // the visitor's OS-level motion preference.
    return <MotionProvider>{children}</MotionProvider>;
  }

  return <AppShell>{children}</AppShell>;
}
