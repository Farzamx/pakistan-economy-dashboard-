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

// Default starting position: bottom-right, safe distance from CreatorBadge
function getDefaultPosition(avatarSize: number): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isMobile = w < 768;
  const rightMargin = isMobile ? SNAP_MARGIN : 24;
  // Mobile: 80px bottom buffer for browser nav bars + CreatorBadge clearance
  // Desktop: 100px bottom buffer
  const bottomMargin = isMobile ? 80 : 100;
  return {
    x: w - avatarSize - rightMargin,
    y: h - avatarSize - bottomMargin,
  };
}

// Snap to nearest horizontal edge; clamp Y inside safe viewport area.
// Returns absolute screen coordinates of the avatar's top-left corner.
function snapToEdge(rawX: number, rawY: number, avatarSize: number): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isMobile = w < 768;
  // Extra bottom clearance on mobile for browser chrome (address bar, nav bar)
  const bottomMargin = isMobile ? 80 : 24;

  // Snap to nearest X edge — "chat heads" style
  const centerX = rawX + avatarSize / 2;
  const snappedX =
    centerX < w / 2
      ? SNAP_MARGIN                      // left edge
      : w - avatarSize - SNAP_MARGIN;    // right edge

  // Clamp Y — never leave safe area
  const minY = SNAP_MARGIN;
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

  // ── Mount: restore or default ───────────────────────────────────────────────
  useEffect(() => {
    const avatarSize = getAvatarSize();
    const saved = loadPosition();

    let pos: { x: number; y: number };
    if (saved) {
      // Re-validate against current viewport (screen may have resized since save)
      pos = snapToEdge(saved.x, saved.y, avatarSize);
    } else {
      pos = getDefaultPosition(avatarSize);
    }

    x.set(pos.x);
    y.set(pos.y);
    setAvatarOnLeft(pos.x < window.innerWidth / 2);
    setMounted(true);
  }, [x, y]);

  // ── Re-clamp on viewport resize ─────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;

    function onResize() {
      const avatarSize = getAvatarSize();
      const snapped = snapToEdge(x.get(), y.get(), avatarSize);
      if (!prefersReducedMotion) {
        animate(x, snapped.x, { type: "spring", stiffness: 300, damping: 25 });
        animate(y, snapped.y, { type: "spring", stiffness: 300, damping: 25 });
      } else {
        x.set(snapped.x);
        y.set(snapped.y);
      }
      setAvatarOnLeft(snapped.x < window.innerWidth / 2);
      savePosition(snapped);
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
    <>
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
                ? { left: SNAP_MARGIN }
                : { right: SNAP_MARGIN }),
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
    </>
  );
}
