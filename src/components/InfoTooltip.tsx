"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TERMINOLOGY } from "@/data/terminology";
import { useTheme } from "@/components/ThemeProvider";

// Session-level cache: termKey → Roman Urdu formatted string
const urduCache = new Map<string, string>();

interface Props {
  termKey: string;
  size?: "xs" | "sm";
}

interface Placement {
  panelStyle: React.CSSProperties;
  arrowStyle: React.CSSProperties;
  isMobile: boolean;
}

const PANEL_WIDTH = 460;

function computePlacement(rect: DOMRect, arrowColor: string): Placement {
  if (window.innerWidth < 640) {
    return {
      panelStyle: {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: `min(90vw, ${PANEL_WIDTH}px)`,
        maxHeight: "80vh",
        overflowY: "auto",
        zIndex: 9999,
      },
      arrowStyle: {},
      isMobile: true,
    };
  }

  const vw = window.innerWidth;

  const cx = rect.left + rect.width / 2;
  let left = cx - PANEL_WIDTH / 2;
  left = Math.max(12, Math.min(left, vw - PANEL_WIDTH - 12));

  const arrowAbsLeft = cx - 5;
  const arrowLeft = Math.max(8, Math.min(arrowAbsLeft - left, PANEL_WIDTH - 20));

  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openAbove = spaceAbove > spaceBelow || spaceAbove > 320;

  const base: React.CSSProperties = {
    position: "fixed",
    left,
    width: PANEL_WIDTH,
    zIndex: 9999,
  };

  if (openAbove) {
    return {
      panelStyle: {
        ...base,
        bottom: window.innerHeight - rect.top + 8,
      },
      arrowStyle: {
        position: "absolute",
        bottom: -5,
        left: arrowLeft,
        width: 0,
        height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: `5px solid ${arrowColor}`,
      },
      isMobile: false,
    };
  }

  return {
    panelStyle: {
      ...base,
      top: rect.bottom + 8,
    },
    arrowStyle: {
      position: "absolute",
      top: -5,
      left: arrowLeft,
      width: 0,
      height: 0,
      borderLeft: "5px solid transparent",
      borderRight: "5px solid transparent",
      borderBottom: `5px solid ${arrowColor}`,
    },
    isMobile: false,
  };
}

export default function InfoTooltip({ termKey, size = "sm" }: Props) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  // All hooks before any conditional return
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [translating, setTranslating] = useState(false);
  const [urduVisible, setUrduVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // ── DEBUG: mount/unmount (temporary — remove once the close bug is verified fixed) ──
  useEffect(() => {
    setMounted(true);
    console.log(`[InfoTooltip:DEBUG] mounted — termKey="${termKey}"`);
    return () => console.log(`[InfoTooltip:DEBUG] unmounted — termKey="${termKey}"`);
  }, [termKey]);

  // ── DEBUG: open/close transitions (temporary) ──
  const hasOpenedBeforeRef = useRef(false);
  useEffect(() => {
    if (open) hasOpenedBeforeRef.current = true;
    // Skip the initial-mount "closed" log — only log real open->closed transitions.
    if (!open && !hasOpenedBeforeRef.current) return;
    console.log(`[InfoTooltip:DEBUG] ${open ? "opened" : "closed"} — termKey="${termKey}"`);
  }, [open, termKey]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const doClose = useCallback(() => {
    // Never close while a translation request is in flight — this is the fix
    // for the bug where clicking "Translate to Roman Urdu" moved focus off the
    // trigger button, firing onBlur's scheduleClose(), which then closed the
    // panel ~80ms later regardless of the in-progress fetch.
    if (translating) return;
    cancelClose();
    setOpen(false);
    setUrduVisible(false);
  }, [cancelClose, translating]);

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(doClose, 80);
  }, [doClose]);

  const doOpen = useCallback(() => {
    if (!triggerRef.current) return;
    cancelClose();
    const rect = triggerRef.current.getBoundingClientRect();
    const arrowColor = isLight ? "#E2E6EF" : "rgba(255,255,255,0.08)";
    setPlacement(computePlacement(rect, arrowColor));
    setOpen(true);
  }, [cancelClose, isLight]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") doClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, doClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(t) &&
        triggerRef.current && !triggerRef.current.contains(t)
      ) {
        doClose();
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open, doClose]);

  const handleTranslate = useCallback(async () => {
    const entry = TERMINOLOGY[termKey];
    if (!entry) return;

    if (urduCache.has(termKey)) {
      setUrduVisible(v => !v);
      return;
    }

    console.log(`[InfoTooltip:DEBUG] translation started — termKey="${termKey}"`);
    setTranslating(true);
    const text = [
      `Kya hai?\n${entry.what}`,
      `Kyun zaroori hai?\n${entry.why}`,
      `Kaise samjhein?\n${entry.how.map(b => `• ${b}`).join("\n")}`,
    ].join("\n\n");

    try {
      const res = await fetch("/api/assistant/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as { translation?: string };
      urduCache.set(termKey, data.translation ?? "Translation unavailable.");
    } catch {
      urduCache.set(termKey, "Translation unavailable.");
    }

    console.log(`[InfoTooltip:DEBUG] translation finished — termKey="${termKey}"`);
    setTranslating(false);
    setUrduVisible(true);
  }, [termKey]);

  const entry = TERMINOLOGY[termKey];
  if (!entry) return null;

  const btnSize = size === "xs" ? "h-3.5 w-3.5 text-[9px]" : "h-4 w-4 text-[10px]";

  const panel =
    open && placement && mounted
      ? createPortal(
          <>
            {/* Mobile backdrop */}
            {placement.isMobile && (
              <div
                className="fixed inset-0 bg-black/60"
                style={{ zIndex: 9998 }}
                onClick={doClose}
              />
            )}

            <div
              ref={panelRef}
              role="tooltip"
              aria-live="polite"
              style={{
                ...placement.panelStyle,
                background: isLight ? "#FFFFFF" : "rgba(8, 10, 26, 0.97)",
                backdropFilter: isLight ? "none" : "blur(24px)",
                WebkitBackdropFilter: isLight ? "none" : "blur(24px)",
                border: isLight ? "1px solid #E2E6EF" : "1px solid rgba(255,255,255,0.10)",
                borderRadius: "0.75rem",
                padding: "1rem",
                boxShadow: isLight
                  ? "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)"
                  : "0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.04)",
              }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              onFocus={cancelClose}
            >
              {/* Arrow (desktop only) */}
              {!placement.isMobile && (
                <div style={placement.arrowStyle} className="pointer-events-none" />
              )}

              {/* Header */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-neon-blue">{entry.title}</p>
                <button
                  onClick={doClose}
                  aria-label="Close tooltip"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] text-white/30 light:text-slate-400 transition-colors hover:text-white/70 light:hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              {/* WHAT */}
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/30 light:text-slate-400">
                What is it?
              </p>
              <p className="mb-3 text-xs leading-relaxed text-white/75 light:text-slate-700">{entry.what}</p>

              {/* WHY */}
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/30 light:text-slate-400">
                Why it matters?
              </p>
              <p className="mb-3 text-xs leading-relaxed text-white/65 light:text-slate-600">{entry.why}</p>

              {/* HOW */}
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-white/30 light:text-slate-400">
                How to read it?
              </p>
              <ul className="mb-3 space-y-1">
                {entry.how.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-white/65 light:text-slate-600">
                    <span className="mt-0.5 shrink-0 text-[8px] text-neon-blue/50">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {/* Divider + translate */}
              <div className="mb-2.5 border-t border-white/[0.06] light:border-slate-200" />

              <button
                onClick={handleTranslate}
                disabled={translating}
                className="flex items-center gap-1.5 text-[10px] text-white/35 light:text-slate-400 transition-colors hover:text-neon-blue/70 light:hover:text-neon-blue disabled:pointer-events-none disabled:opacity-50"
              >
                {translating ? (
                  <>
                    <span className="assistant-dot-pulse" />
                    <span>Translating…</span>
                  </>
                ) : (
                  <>
                    <span>🌐</span>
                    <span>{urduVisible ? "Hide Roman Urdu" : "Roman Urdu"}</span>
                  </>
                )}
              </button>

              {/* Roman Urdu block — only this sub-block scrolls if long */}
              {urduVisible && urduCache.has(termKey) && (
                <div className="mt-2.5 rounded-lg border border-white/5 light:border-blue-100 bg-[#071420] light:bg-blue-50 p-3" style={{ maxHeight: 160, overflowY: "auto" }}>
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-neon-blue/40 light:text-blue-500">
                    Roman Urdu
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-white/60 light:text-slate-700">
                    {urduCache.get(termKey)}
                  </p>
                </div>
              )}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <span className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`What is ${entry.title}?`}
        aria-expanded={open}
        onMouseEnter={doOpen}
        onMouseLeave={scheduleClose}
        onFocus={doOpen}
        onBlur={scheduleClose}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          open ? doClose() : doOpen();
        }}
        className={`inline-flex items-center justify-center rounded-full border border-white/20 light:border-slate-300 font-semibold text-white/35 light:text-slate-400 transition-colors hover:border-neon-blue/60 hover:text-neon-blue focus:outline-none focus-visible:ring-1 focus-visible:ring-neon-blue ${btnSize}`}
      >
        ?
      </button>
      {panel}
    </span>
  );
}
