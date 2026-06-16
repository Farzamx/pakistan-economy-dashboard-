"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TERMINOLOGY } from "@/data/terminology";

interface Props {
  /** Must match a key in TERMINOLOGY exactly. Renders nothing if not found. */
  termKey: string;
  /** Visual size of the trigger button. Defaults to "sm". */
  size?: "xs" | "sm";
}

export default function InfoTooltip({ termKey, size = "sm" }: Props) {
  const entry = TERMINOLOGY[termKey];
  if (!entry) return null;

  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(true);
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const computePlacement = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setAbove(rect.top > 240);
    setAlignRight(rect.left > window.innerWidth * 0.62);
  }, []);

  const show = useCallback(() => {
    computePlacement();
    setOpen(true);
  }, [computePlacement]);

  const hide = useCallback(() => setOpen(false), []);

  // Close on outside click (for mobile tap-toggle)
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const btnSize =
    size === "xs"
      ? "h-3.5 w-3.5 text-[9px]"
      : "h-4 w-4 text-[10px]";

  const yClass = above
    ? "bottom-[calc(100%+6px)]"
    : "top-[calc(100%+6px)]";

  const xClass = alignRight
    ? "right-0"
    : "left-1/2 -translate-x-1/2";

  return (
    <div
      ref={containerRef}
      className="relative inline-flex shrink-0"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        aria-label={`What is ${entry.title}?`}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          open ? hide() : show();
        }}
        onFocus={show}
        onBlur={hide}
        className={`inline-flex items-center justify-center rounded-full border border-white/20 font-semibold text-white/35 transition-colors hover:border-neon-blue/60 hover:text-neon-blue focus:outline-none focus-visible:ring-1 focus-visible:ring-neon-blue ${btnSize}`}
      >
        ?
      </button>

      {open && (
        <div
          role="tooltip"
          aria-live="polite"
          className={`absolute z-50 w-[288px] rounded-xl border border-white/10 p-4 shadow-2xl ${yClass} ${xClass}`}
          style={{
            background: "rgba(8, 10, 26, 0.94)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Arrow connector */}
          <div
            className={`pointer-events-none absolute ${
              above
                ? "bottom-[-5px] border-t-[5px] border-t-white/10"
                : "top-[-5px] border-b-[5px] border-b-white/10"
            } ${
              alignRight ? "right-3" : "left-1/2 -translate-x-1/2"
            } h-0 w-0 border-x-[5px] border-x-transparent`}
          />

          <p className="mb-2 text-xs font-semibold text-neon-blue">
            {entry.title}
          </p>

          <p className="mb-2 text-xs leading-relaxed text-white/75">
            {entry.definition}
          </p>

          <div className="mb-2 border-t border-white/[0.06]" />

          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/30">
            Why it matters
          </p>
          <p className="mb-2 text-xs leading-relaxed text-white/65">
            {entry.whyItMatters}
          </p>

          <div className="mb-2 border-t border-white/[0.06]" />

          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/30">
            How to interpret
          </p>
          <p className="text-xs leading-relaxed text-white/65">
            {entry.interpretation}
          </p>
        </div>
      )}
    </div>
  );
}
