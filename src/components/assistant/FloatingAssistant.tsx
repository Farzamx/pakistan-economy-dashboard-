"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { DashboardSnapshot } from "@/lib/assistantContext";
import AssistantAvatar from "./AssistantAvatar";
import AssistantChat from "./AssistantChat";

interface Props {
  context: DashboardSnapshot;
}

const STORAGE_KEY = "assistant-position";
const DEFAULT_BOTTOM = 96; // px from bottom — above CreatorBadge (bottom-3 = 12px)
const DEFAULT_RIGHT = 24;  // px from right

interface SavedPosition {
  x: number;
  y: number;
}

function loadPosition(): SavedPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedPosition) : null;
  } catch {
    return null;
  }
}

function savePosition(pos: SavedPosition) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export default function FloatingAssistant({ context }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Drag position — starts at default bottom-right, restored from localStorage
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hydrate position from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setMounted(true);
    const saved = loadPosition();
    if (saved) {
      x.set(saved.x);
      y.set(saved.y);
    }
  }, [x, y]);

  function handleDragEnd() {
    savePosition({ x: x.get(), y: y.get() });
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Don't render during SSR to avoid hydration mismatch with localStorage position
  if (!mounted) return null;

  return (
    <motion.div
      ref={containerRef}
      drag
      dragMomentum={false}
      dragElastic={0.08}
      onDragEnd={handleDragEnd}
      style={{
        x,
        y,
        position: "fixed",
        bottom: DEFAULT_BOTTOM,
        right: DEFAULT_RIGHT,
        zIndex: 50,
      }}
      className="select-none touch-none"
      aria-label="Pakistan Economic Intelligence Assistant"
    >
      <div className="flex flex-col items-end gap-2">
        {/* Chat panel — above the avatar */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              style={{ transformOrigin: "bottom right" }}
            >
              <AssistantChat
                context={context}
                onClose={() => setIsOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar button */}
        <AssistantAvatar
          isOpen={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        />
      </div>
    </motion.div>
  );
}
