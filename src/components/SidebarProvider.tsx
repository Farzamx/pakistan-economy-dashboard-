"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "dashboard-sidebar-collapsed";

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
});

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}

/**
 * Collapsible-sidebar state (PEIC v3 IA restructure) — shared so Sidebar.tsx
 * can shrink to an icon-free rail and every page's <main> (already flex-1)
 * reflows to fill the reclaimed width automatically, with no per-page
 * layout change needed. Defaults to expanded (matches every existing
 * screenshot/expectation); persisted like theme/language so a returning
 * visitor's preference sticks.
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}
