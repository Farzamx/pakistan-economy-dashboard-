"use client";

// Custom listbox replacing native <select> for cases where the dropdown
// needs to stay readable over the dark/galaxy theme. Native <select> popups
// are rendered by the OS/browser outside the page's DOM tree, so CSS like
// `background: var(--surface)` on the <select> itself is ignored by the
// popup — it falls back to a white system panel, which is unreadable
// against this dashboard's near-white text colors. Verified by screenshot
// during the Fiscal Year dropdown audit before building this component.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  /** Visually-hidden label for screen readers + the visible inline label text next to the trigger. */
  label: string;
  className?: string;
}

export default function Dropdown<T extends string>({ value, options, onChange, label, className }: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    // Scroll the selected option into view — without this, reopening a long
    // list (17 fiscal years, ~7 fit in the visible area) always resets to
    // the top instead of showing where the current selection actually is.
    const frame = requestAnimationFrame(() => {
      listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function openMenu() {
    // Reset highlight here (in the same event handler that flips `open`),
    // not in a useEffect keyed on `open` — calling setState synchronously
    // inside an effect triggers React's cascading-render lint rule.
    setHighlighted(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function commit(index: number) {
    const opt = options[index];
    if (opt) onChange(opt.value);
    setOpen(false);
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(highlighted);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] outline-none transition-all hover:border-neon-blue/40 hover:shadow-[0_0_14px_rgba(56,189,248,0.18)] focus-visible:border-neon-blue/50"
      >
        <span>{selected?.label}</span>
        <svg
          className={`h-3 w-3 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={handleListKeyDown}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 z-50 mt-2 max-h-64 w-44 overflow-y-auto rounded-xl border border-[var(--border)] p-1 shadow-2xl outline-none backdrop-blur-xl"
            style={{ backgroundColor: "var(--space-700)" }}
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isHighlighted = i === highlighted;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => commit(i)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "bg-neon-blue/15 font-semibold text-neon-blue"
                      : isHighlighted
                        ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <svg className="h-3.5 w-3.5 shrink-0 text-neon-blue" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2.5 6.5L5 9L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
