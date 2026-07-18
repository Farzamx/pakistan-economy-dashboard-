"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardSnapshot } from "@/lib/assistantContext";
import { useSafeReducedMotion } from "@/hooks/useSafeReducedMotion";
import AssistantAvatar from "./AssistantAvatar";
import AssistantChat from "./AssistantChat";

interface Props {
  context: DashboardSnapshot;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// New key — v1 used relative offsets (incompatible). v2 stores absolute coords.
const STORAGE_KEY = "assistant-position-v2";

const SNAP_MARGIN = 16;        // px from screen edge after snap
const CHAT_GAP = 10;           // px gap between avatar top and chat panel bottom

// ── Position helpers ──────────────────────────────────────────────────────────

// Returns current avatar size in px, matching Tailwind classes in AssistantAvatar:
//   w-11 (44px) / md:w-[52px] / lg:w-14 (56px)
function getAvatarSize(): number {
  if (typeof window === "undefined") return 56;
  const w = window.innerWidth;
  if (w < 768) return 44;
  if (w < 1024) return 52;
  return 56;
}

// ── Content-aware geometry (mobile UI stability audit) ─────────────────────────
//
// The default position used to be pure viewport math (innerWidth/innerHeight
// minus a flat margin) with zero awareness of what was actually on screen.
// Confirmed bug: on a short, narrow real device (iPhone SE 375x667, and a
// 320x568 profile), the Hero's large wrapped headline reached far enough
// down the page that the "bottom-right corner" default landed directly on
// top of its text on first load. Fixed below by measuring real, current
// geometry instead of guessing — the same DOM the user actually sees.

/** env(safe-area-inset-*) via a live computed-style probe — real notch/home-indicator insets, not an assumption. */
function getSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;visibility:hidden;" +
    "padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);" +
    "padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px);";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/**
 * Bottom edge of the sticky header stack currently rendered on THIS page —
 * TopNav + the Market Ribbon on the homepage, just the ribbon on SEO pages,
 * nothing on auth pages. Measured live via getBoundingClientRect() rather
 * than hardcoding "TopNav is 64px" — stays correct if those components'
 * height ever changes, and degrades gracefully (returns 0) on pages that
 * have no sticky header at all.
 */
function getStickyHeaderBottom(): number {
  if (typeof document === "undefined") return 0;
  const vw = window.innerWidth;
  let bottom = 0;
  const candidates = document.querySelectorAll<HTMLElement>("header, [class*='sticky']");
  for (const el of candidates) {
    const cs = getComputedStyle(el);
    if (cs.position !== "sticky" && cs.position !== "fixed") continue;
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.top > 150 || r.width < vw * 0.7) continue; // not a top-anchored, full-width bar
    if (r.bottom > bottom) bottom = r.bottom;
  }
  return Math.max(0, bottom);
}

/**
 * Top edge of the nearest bottom-anchored fixed element that would actually
 * sit under the avatar at (avatarX, avatarSize) — the guest "Create Free
 * Account" CTA, CreatorBadge's attribution tag, or any future fixed bottom
 * bar — so the assistant never lands on top of another button or badge.
 * Excludes the assistant's own root (data-assistant-root).
 */
function getStickyFooterTop(viewportHeight: number, avatarX: number, avatarSize: number): number {
  if (typeof document === "undefined") return viewportHeight;
  let top = viewportHeight;
  const candidates = document.querySelectorAll<HTMLElement>("[class*='fixed']");
  for (const el of candidates) {
    if (el.closest("[data-assistant-root]")) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") continue;
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 20) continue; // skip tiny icons/dots
    // "Near the bottom" means sitting in the lower half of the viewport —
    // not literally flush against the bottom edge. Confirmed live: the
    // guest sign-up CTA sits at bottom-20 (80px up from the true edge, for
    // browser-chrome clearance), which a stricter "within 4px of the
    // bottom" check was excluding entirely.
    if (r.top < viewportHeight * 0.5) continue;
    // Horizontal overlap with where the avatar would actually sit — not a
    // "must be wide" filter, which excluded CreatorBadge (a narrow,
    // right-anchored badge that shares the avatar's own right-hand corner
    // and is exactly as real a collision risk as a wide bar like the
    // guest CTA).
    if (r.right < avatarX || r.left > avatarX + avatarSize) continue;
    if (r.top < top) top = r.top;
  }
  return top;
}

/**
 * Ground-truth collision check: is there real, meaningful content actually
 * rendered at this screen point right now? Walks up from the exact
 * elementFromPoint() hit (not a structural guess about "what usually
 * follows an h1") looking for direct text or an interactive control —
 * plain decorative background containers (a card's padding, a section
 * wrapper) don't count, since sitting over empty padding isn't a real
 * overlap. This is what actually ties "safe" to what a user would see,
 * across every page's differing layout, instead of assuming a page shape.
 */
function pointHasMeaningfulContent(px: number, py: number): boolean {
  const el = document.elementFromPoint(px, py);
  if (!el) return false;
  if (el.closest("[data-assistant-root]")) return false;
  // Interactive control at or above the hit point (a link/button often
  // wraps its own icon+label as child elements, so the exact pixel hit can
  // land on an inner span rather than the <a>/<button> itself).
  if (el.closest("a, button, input, textarea, select")) return true;
  const tag = el.tagName;
  if (tag === "IMG" || tag === "SVG" || tag === "CANVAS") return true;

  // Prose elements — a heading, paragraph, or inline text run — count as
  // unsafe across their WHOLE box, not just an exact glyph hit. A large
  // multi-line headline's inter-line gaps still read as "sitting on top of
  // the headline" to a user even if a sample point technically lands
  // between two lines of text or two letters; confirmed live, the glyph-
  // precision check below let the avatar rest inside the Hero headline's
  // own line-height gaps on a short viewport where the headline is the
  // confirmed real bug this whole check exists for.
  const PROSE_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "SPAN", "LI", "LABEL", "STRONG", "EM", "B", "I"]);
  let proseNode: Element | null = el;
  for (let i = 0; i < 3 && proseNode && proseNode !== document.body; i++) {
    if (PROSE_TAGS.has(proseNode.tagName) && (proseNode.textContent ?? "").trim().length > 0) {
      return true;
    }
    proseNode = proseNode.parentElement;
  }

  // Otherwise (a generic wrapper div/section that might be a large page
  // container), fall back to a precise glyph check — does an actual
  // rendered character's own box contain this exact pixel — so the
  // wrapper's own blank padding doesn't get flagged just because real text
  // exists elsewhere inside the same wrapper (confirmed live: the Hero's
  // outer page wrapper, and CreatorBadge's outer div before this refinement).
  // elementFromPoint() on a large section wrapper (e.g. the Hero's own
  // root div, which spans the full page width including its own blank
  // padding) returns that wrapper for every pixel inside it, and a naive
  // `.textContent` check would flag its padding as "text" just because
  // real text exists elsewhere inside the same wrapper (confirmed live).
  // caretPositionFromPoint/caretRangeFromPoint are the browser's own
  // text-hit-testing primitives (used for click-to-place-cursor); a
  // rendered glyph's own client rect actually containing (px, py) is
  // real confirmation, not an inference from ancestor structure.
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  let textNode: Node | null = null;
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(px, py);
    textNode = pos?.offsetNode ?? null;
  } else if (doc.caretRangeFromPoint) {
    textNode = doc.caretRangeFromPoint(px, py)?.startContainer ?? null;
  }
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !(textNode.textContent ?? "").trim()) {
    return false;
  }
  const range = document.createRange();
  range.selectNodeContents(textNode);
  for (const r of Array.from(range.getClientRects())) {
    if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) return true;
  }
  return false;
}

/** Samples the avatar's four corners + center at a candidate position against the real rendered page. */
function isPositionClear(x: number, y: number, size: number): boolean {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const inset = 6; // sample slightly inside the footprint, not its exact edge
  const points: [number, number][] = [
    [x + size / 2, y + size / 2],
    [x + inset, y + inset],
    [x + size - inset, y + inset],
    [x + inset, y + size - inset],
    [x + size - inset, y + size - inset],
  ];
  for (const [px, py] of points) {
    if (px < 0 || py < 0 || px > vw || py > vh) continue;
    if (pointHasMeaningfulContent(px, py)) return false;
  }
  return true;
}

// Default starting position — bottom-right, clear of the sticky header,
// other fixed bottom bars, and the device's safe-area insets, then verified
// against the actually-rendered page via isPositionClear(). Every input is
// measured live; nothing here is a hardcoded pixel guess.
//
// `safe: false` means real content is genuinely rendered at that spot right
// now — confirmed on real short/narrow profiles (320x568, 375x667): the
// wrapped Hero headline alone can be taller than the entire viewport, so by
// definition nothing on screen avoids it. The caller hides the avatar
// entirely in that case rather than show it overlapping anything, and
// re-checks as the user scrolls (see the component's scroll handler) —
// once enough content has scrolled past, `safe` naturally becomes true and
// the avatar fades in.
function getDefaultPosition(avatarSize: number): { x: number; y: number; safe: boolean } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isMobile = w < 768;
  const insets = getSafeAreaInsets();

  const rightMargin = (isMobile ? SNAP_MARGIN : 24) + insets.right;
  const x = w - avatarSize - rightMargin;

  // Buffer for mobile browser chrome (address bar / gesture-nav bar) —
  // real-world clearance on TOP of the true safe-area inset, which most
  // mobile browsers don't report through env() while the page is scrolled.
  const chromeBuffer = isMobile ? 64 : 16;
  const minBottomClearance = insets.bottom + chromeBuffer;

  const headerBottom = getStickyHeaderBottom();
  const footerTop = getStickyFooterTop(h, x, avatarSize);

  const hardMinY = headerBottom + SNAP_MARGIN;
  const hardMaxY = h - avatarSize - minBottomClearance;
  const footerClearY = footerTop - avatarSize - SNAP_MARGIN;

  // Bottom-hugging, but never below the sticky-footer bar and never past
  // either hard bound.
  let y = Math.min(hardMaxY, footerClearY);
  y = Math.max(y, hardMinY);
  y = Math.min(y, hardMaxY);
  y = Math.max(y, SNAP_MARGIN);

  const safe = isPositionClear(x, y, avatarSize);
  return { x, y, safe };
}

// Snap to nearest horizontal edge; clamp Y inside safe viewport area.
// Returns absolute screen coordinates of the avatar's top-left corner.
// Used for re-clamping a USER-CHOSEN (dragged/saved) position after a
// resize — deliberately does not apply the content-aware logic above, so a
// deliberate manual placement is never second-guessed, only kept on screen.
function snapToEdge(rawX: number, rawY: number, avatarSize: number): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isMobile = w < 768;
  const insets = getSafeAreaInsets();
  // Extra bottom clearance on mobile for browser chrome (address bar, nav bar)
  const bottomMargin = (isMobile ? 80 : 24) + insets.bottom;

  // Snap to nearest X edge — "chat heads" style
  const centerX = rawX + avatarSize / 2;
  const snappedX =
    centerX < w / 2
      ? SNAP_MARGIN + insets.left                      // left edge
      : w - avatarSize - SNAP_MARGIN - insets.right;    // right edge

  // Clamp Y — never leave safe area
  const minY = SNAP_MARGIN + insets.top;
  const maxY = h - avatarSize - bottomMargin;
  const snappedY = Math.max(minY, Math.min(rawY, maxY));

  return { x: snappedX, y: snappedY };
}

// Compute chat panel's `bottom` value (px from viewport bottom) to appear
// directly above the avatar. Called only when opening chat (drag is locked then).
function getChatBottom(avatarY: number, avatarSize: number): number {
  return window.innerHeight - avatarY - avatarSize - CHAT_GAP;
}

// ── Persistence ────────────────────────────────────────────────────────────────

function loadPosition(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { x: number; y: number }) : null;
  } catch {
    return null;
  }
}

function savePosition(pos: { x: number; y: number }): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FloatingAssistant({ context }: Props) {
  const prefersReducedMotion = useSafeReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // True while a modal/drawer has locked body scroll (every overlay in this
  // app — SettingsModal, GuestAccessModal, PsxComingSoonModal,
  // LogoutConfirmModal, DataSourcesModal, MobileNav's own drawer — sets
  // document.body.style.overflow = "hidden" while open, the one convention
  // already shared across every current and future overlay). The assistant
  // hides itself for the duration rather than risk sitting on top of, or
  // behind, whatever modal is showing.
  const [modalOpen, setModalOpen] = useState(false);
  // True only for the computed-default (never-dragged) case, and only when
  // no Y position in the current viewport actually clears the page's
  // headline/intro content (see getDefaultPosition's `safe` flag) — e.g. a
  // wrapped Hero headline that's taller than a short phone's entire
  // viewport. Rather than show the avatar sitting on top of that text, it
  // stays hidden until the user scrolls far enough for a genuinely safe
  // spot to exist, then fades in there. Never applies once the user has
  // manually placed the avatar — a saved position is always honored as-is.
  const [pendingSafeReveal, setPendingSafeReveal] = useState(false);
  const hasSavedPositionRef = useRef(false);

  // Avatar is on the left side of the screen — determines chat alignment
  const [avatarOnLeft, setAvatarOnLeft] = useState(false);

  // Chat panel `bottom` offset from viewport bottom — recomputed on each open
  const [chatBottom, setChatBottom] = useState(100);

  // Refs for click-outside detection
  const chatRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Absolute position of avatar's top-left corner
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // ── Mount: restore or compute a safe default ────────────────────────────────
  useEffect(() => {
    const avatarSize = getAvatarSize();
    const saved = loadPosition();
    hasSavedPositionRef.current = !!saved;

    let pos: { x: number; y: number };
    if (saved) {
      // Re-validate against current viewport (screen may have resized since save)
      pos = snapToEdge(saved.x, saved.y, avatarSize);
    } else {
      const computed = getDefaultPosition(avatarSize);
      pos = computed;
      setPendingSafeReveal(!computed.safe);
    }

    x.set(pos.x);
    y.set(pos.y);
    setAvatarOnLeft(pos.x < window.innerWidth / 2);
    setMounted(true);
  }, [x, y]);

  // ── Re-check for a safe spot as the user scrolls away from the top ──────────
  // Only relevant right after mount, only while there's no saved (user-
  // chosen) position, and only until the first safe spot is found — this is
  // specifically the "hide until the initial Hero/headline text has
  // scrolled out of the way" fallback, not a permanent per-scroll collision
  // detector. Deliberately does NOT keep running indefinitely: on a
  // content-dense page, some scrollable content (a KPI table, a chart) is
  // realistically almost always underneath a fixed bottom-right corner at
  // SOME scroll depth, and every production floating-widget (Intercom,
  // Drift, Zendesk, etc.) accepts that same tradeoff — a fixed corner,
  // rendered on top of whatever scrolls under it — rather than disappearing
  // for the rest of the page. The structural checks in getDefaultPosition
  // (sticky header, sticky footer bar, safe-area insets) are scroll-
  // position-independent and stay correct without needing to keep watching.
  // rAF-throttled to one measurement per frame regardless of scroll
  // event frequency.
  useEffect(() => {
    if (!mounted || !pendingSafeReveal || hasSavedPositionRef.current) return;

    // Bounded search: on a content-dense page, dense scrollable content
    // (a KPI table, a chart) can realistically sit under a fixed corner at
    // almost any depth — chasing a perfectly clear spot indefinitely
    // confirmed live to leave the avatar hidden for an entire 18,000px
    // page. Give the initial obstruction (the actual bug this exists for —
    // a wrapped headline taller than a short viewport) up to 1.5 viewport
    // heights of scroll to clear on its own; beyond that, show the avatar
    // at its structurally-computed position anyway, same tradeoff every
    // production floating widget (Intercom, Drift, Zendesk) makes.
    const revealByScrollY = window.scrollY + window.innerHeight * 1.5;

    let rafId: number | null = null;
    function recompute() {
      rafId = null;
      const avatarSize = getAvatarSize();
      const computed = getDefaultPosition(avatarSize);
      x.set(computed.x);
      y.set(computed.y);
      if (computed.safe || window.scrollY >= revealByScrollY) setPendingSafeReveal(false);
    }
    function onScroll() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(recompute);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [mounted, pendingSafeReveal, x, y]);

  // ── Watch for any modal/drawer opening (shared body-scroll-lock convention) ──
  useEffect(() => {
    if (typeof document === "undefined") return;
    const check = () => setModalOpen(document.body.style.overflow === "hidden");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  // ── Re-clamp on viewport resize ─────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;

    function onResize() {
      const avatarSize = getAvatarSize();
      // No saved (user-chosen) position yet — a resize (e.g. orientation
      // change) re-runs the full content-aware computation, same as mount,
      // rather than just re-clamping the old coordinates to new bounds.
      const snapped = hasSavedPositionRef.current ? snapToEdge(x.get(), y.get(), avatarSize) : null;
      const computed = snapped ? null : getDefaultPosition(avatarSize);
      const next = snapped ?? computed!;

      if (!prefersReducedMotion) {
        animate(x, next.x, { type: "spring", stiffness: 300, damping: 25 });
        animate(y, next.y, { type: "spring", stiffness: 300, damping: 25 });
      } else {
        x.set(next.x);
        y.set(next.y);
      }
      setAvatarOnLeft(next.x < window.innerWidth / 2);
      if (snapped) savePosition(snapped);
      else setPendingSafeReveal(!computed!.safe);
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted, prefersReducedMotion, x, y]);

  // ── Escape key closes chat ──────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // ── Click outside to close ──────────────────────────────────────────────────
  // Fires on pointerdown (covers mouse + touch) while the panel is open.
  // Clicks inside the chat panel or on the avatar are ignored — the avatar's
  // own onClick handler manages the toggle.
  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (chatRef.current?.contains(target) || avatarRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  // ── Drag end → snap to nearest edge ────────────────────────────────────────
  const handleDragEnd = useCallback(() => {
    const avatarSize = getAvatarSize();
    const snapped = snapToEdge(x.get(), y.get(), avatarSize);

    if (!prefersReducedMotion) {
      animate(x, snapped.x, { type: "spring", stiffness: 400, damping: 30 });
      animate(y, snapped.y, { type: "spring", stiffness: 400, damping: 30 });
    } else {
      x.set(snapped.x);
      y.set(snapped.y);
    }

    setAvatarOnLeft(snapped.x < window.innerWidth / 2);
    savePosition(snapped);
  }, [prefersReducedMotion, x, y]);

  // ── Avatar click: compute chat position, toggle open ───────────────────────
  function handleAvatarClick() {
    if (!isOpen) {
      const avatarSize = getAvatarSize();
      setChatBottom(getChatBottom(y.get(), avatarSize));
    }
    setIsOpen((prev) => !prev);
  }

  if (!mounted) return null;

  return (
    <div data-assistant-root style={{ display: modalOpen || pendingSafeReveal ? "none" : "contents" }}>
      {/* ── Chat panel ─────────────────────────────────────────────────────────
          Separate fixed element — decoupled from the avatar's motion.div.
          Always anchored to screen edge (left or right) so it never overflows. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatRef}
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: 10, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 6, scale: 0.97 }
            }
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            style={{
              position: "fixed",
              bottom: chatBottom,
              ...(avatarOnLeft
                ? { left: `max(${SNAP_MARGIN}px, env(safe-area-inset-left, 0px))` }
                : { right: `max(${SNAP_MARGIN}px, env(safe-area-inset-right, 0px))` }),
              zIndex: 51,
              transformOrigin: avatarOnLeft ? "bottom left" : "bottom right",
            }}
          >
            <AssistantChat
              context={context}
              onClose={() => setIsOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Avatar ─────────────────────────────────────────────────────────────
          Draggable (locked when chat is open).
          position: fixed; left: 0; top: 0 — x/y are absolute screen coords. */}
      <motion.div
        ref={avatarRef}
        drag={!isOpen}
        dragMomentum={false}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        style={{
          x,
          y,
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 50,
        }}
        className="select-none touch-none"
        aria-label="Pakistan Economic Intelligence Assistant"
      >
        <AssistantAvatar isOpen={isOpen} onClick={handleAvatarClick} />
      </motion.div>
    </div>
  );
}
