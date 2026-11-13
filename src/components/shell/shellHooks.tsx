"use client";

// Behaviour shared by AppHeader, NavMenu, AccountControl and MobileDrawer
// (PEIC redesign Phase 2). Each hook is a direct carry-over of logic that
// already existed — and was already debugged — in the components the new
// shell replaces, so the shell inherits those fixes instead of re-learning
// them:
//   useGuestGate   — TopNav/Sidebar/MobileNav's protected-path interception
//   useSignOutFlow — SidebarAuthCard/MobileNav's sign-out sequence
//   useDismiss     — outside-click / Escape / focus-leave closing for popups

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { usePathname, useRouter } from "next/navigation";
import GuestAccessModal from "@/components/GuestAccessModal";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import { useAuth } from "@/components/AuthProvider";
import { signOutAction } from "@/app/auth/actions";
import { isProtectedPath } from "@/lib/protectedSections";
import { OVERVIEW_PATH, OVERVIEW_SECTIONS, activeSectionAt, hrefPath } from "@/lib/appNav";

/**
 * Intercepts a click on a protected destination for a signed-out visitor and
 * shows GuestAccessModal instead. Server-side enforcement (src/proxy.ts) is
 * unchanged and still the real gate; this only replaces a hard redirect to
 * /login with the existing explanatory modal, exactly as the old nav did.
 * `gate` returns true when it intercepted, so a drawer can close itself first
 * (GuestAccessModal is z-50, below the drawer's z-[60]).
 */
export function useGuestGate(): { gate: (e: React.MouseEvent, href: string) => boolean; guestModal: ReactNode } {
  const { user, loading } = useAuth();
  const [destination, setDestination] = useState<string | null>(null);

  // The header (and with it this dialog's state) outlives a client-side navigation. Choosing Log in / Sign up in the dialog navigates to /login or /signup;
  // without this the dialog would stay open on top of the sign-in form and block it. Any route change closes it (adjusted during render, React's pattern for
  // resetting state when a value changes, as AppHeader does for its menus).
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setDestination(null);
  }

  const gate = useCallback(
    (e: React.MouseEvent, href: string) => {
      // Hash/query stripped first: "/economic-calendar#email-alerts" is the
      // protected /economic-calendar page, which isProtectedPath only
      // recognises from its path.
      if (loading || user || !isProtectedPath(hrefPath(href))) return false;
      e.preventDefault();
      setDestination(href);
      return true;
    },
    [loading, user],
  );

  const guestModal = (
    <GuestAccessModal open={destination !== null} onClose={() => setDestination(null)} destination={destination ?? "/overview"} />
  );
  return { gate, guestModal };
}

/**
 * Sign-out with confirmation. Same sequence as SidebarAuthCard: both the
 * server action (clears the session cookie proxy.ts reads) and the client
 * signOut (clears AuthProvider's own Supabase client), then the try/finally
 * that guarantees the confirmation modal can never stay stuck on a spinner.
 */
export function useSignOutFlow(): { requestSignOut: () => void; signOutModal: ReactNode } {
  const { signOut } = useAuth();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await Promise.all([signOutAction(), signOut()]);
      router.push("/overview");
      router.refresh();
    } finally {
      if (isMountedRef.current) {
        setSigningOut(false);
        setConfirmOpen(false);
      }
    }
  }

  const signOutModal = (
    <LogoutConfirmModal open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleSignOut} loading={signingOut} />
  );
  return { requestSignOut: () => setConfirmOpen(true), signOutModal };
}

/**
 * Closes a popup (dropdown panel, account menu) when the pointer goes down
 * outside it, on Escape (returning focus to its trigger), or when keyboard
 * focus moves to something outside it.
 *
 * Focus-leave only closes when focus moved to a KNOWN element outside. A
 * null relatedTarget (Safari does not focus links/buttons on click) must not
 * close the panel, or it would unmount the link under the pointer before its
 * click fired — the same class of race MobileNav.tsx documents for its drawer.
 */
export function useDismiss(
  open: boolean,
  close: () => void,
  containerRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      close();
      triggerRef.current?.focus();
    }
    function onFocusIn(e: FocusEvent) {
      const target = e.target as Node | null;
      if (target && containerRef.current && !containerRef.current.contains(target)) close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, close, containerRef, triggerRef]);
}

/**
 * /overview "On this page" state (Phase 2.1): which OVERVIEW_SECTIONS are on
 * the page right now, and which one is in view. Replaces the retired
 * sidebar's scroll-spy. Measures at most once per animation frame on scroll,
 * resize, and DOM changes inside <main> (HideableSection mounts sections only
 * after preferences load), and only re-renders when the answer changes.
 */
export function useOverviewSections(enabled: boolean): { active: string | null; present: string[] } {
  const [state, setState] = useState<{ active: string | null; present: string[] }>({ active: null, present: [] });

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      // The line a section must pass to count as "in view": just below the
      // sticky header + market ticker. 80px also exceeds the sections' own
      // scroll-margin, so a section jumped to from the menu reads as current.
      const headerBottom = document.querySelector("[data-app-header]")?.getBoundingClientRect().bottom ?? 56;
      const positions: { id: string; top: number }[] = [];
      for (const s of OVERVIEW_SECTIONS) {
        const el = document.getElementById(s.id);
        if (el) positions.push({ id: s.id, top: el.getBoundingClientRect().top });
      }
      const next = { active: activeSectionAt(positions, headerBottom + 80), present: positions.map((p) => p.id) };
      setState((prev) => (prev.active === next.active && prev.present.join() === next.present.join() ? prev : next));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [enabled]);

  return enabled ? state : { active: null, present: [] };
}

/**
 * Jumps to an /overview section: scrolls (smoothly unless the visitor prefers
 * reduced motion), records the hash without adding history entries (as the
 * old sidebar did), and moves keyboard focus to the section so the next Tab
 * continues from there instead of from the top of the page.
 */
export function goToOverviewSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  window.history.replaceState(null, "", `${OVERVIEW_PATH}#${id}`);
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  return true;
}

/** Arrow-key movement between the links/buttons inside a menu panel. */
export function handleMenuArrowKeys(e: React.KeyboardEvent<HTMLElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
  if (items.length === 0) return;
  e.preventDefault();
  const index = items.indexOf(document.activeElement as HTMLElement);
  let next = 0;
  if (e.key === "End") next = items.length - 1;
  else if (e.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
  else if (e.key === "ArrowUp") next = index <= 0 ? items.length - 1 : index - 1;
  items[next]?.focus();
}
