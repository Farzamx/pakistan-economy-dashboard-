"use client";

// Controls for the analytical sections. Every one is a native form control
// (radio group, checkbox buttons, <select>) so keyboard and screen-reader
// behaviour comes from the platform, and every one drives real state.

import type { ReactNode } from "react";

export interface Option<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Choose exactly one: a radio group styled as a segmented control. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  name,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Unique within the page (radio groups are keyed by name). */
  name: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-[11px] font-medium uppercase tracking-[0.05em] text-pe-text-3">{label}</legend>
      <div className="inline-flex max-w-full flex-wrap overflow-hidden rounded-[var(--pe-radius)] border border-pe-border-strong bg-pe-surface">
        {options.map((o) => (
          <label
            key={o.value}
            className={`relative cursor-pointer select-none border-e border-pe-border px-3 py-1.5 text-[13px] last:border-e-0 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[var(--pe-focus)] ${
              o.disabled ? "cursor-not-allowed text-pe-text-3 opacity-50" : value === o.value ? "bg-pe-accent font-medium text-[var(--pe-surface)]" : "text-pe-text-2 hover:bg-pe-surface-2"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  /** Dash pattern, e.g. "5 3": a second, non-colour cue for line series. */
  dash?: string;
  disabled?: boolean;
}

/** Series visibility: each item is a toggle button (aria-pressed) with a colour key. */
export function SeriesToggles({
  label,
  items,
  active,
  onToggle,
  minActive = 1,
}: {
  label: string;
  items: LegendItem[];
  active: ReadonlySet<string>;
  onToggle: (key: string) => void;
  /** The last visible series cannot be switched off — an empty chart explains nothing. */
  minActive?: number;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-pe-text-3">{label}</span>
      {items.map((it) => {
        const on = active.has(it.key);
        const locked = on && active.size <= minActive;
        return (
          <button
            key={it.key}
            type="button"
            aria-pressed={on}
            disabled={it.disabled || locked}
            onClick={() => onToggle(it.key)}
            title={locked ? "At least one series must stay visible" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-[var(--pe-radius)] border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pe-focus)] disabled:cursor-not-allowed ${
              on ? "border-pe-border-strong bg-pe-surface-2 text-pe-text" : "border-pe-border bg-pe-surface text-pe-text-3 line-through decoration-1"
            } ${it.disabled ? "opacity-40" : ""}`}
          >
            <svg width="16" height="8" aria-hidden className="shrink-0">
              <line x1="0" y1="4" x2="16" y2="4" stroke={it.color} strokeWidth="3" strokeDasharray={it.dash} strokeLinecap="round" opacity={on ? 1 : 0.35} />
            </svg>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** A labelled native <select>. */
export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  id,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-[11px] font-medium uppercase tracking-[0.05em] text-pe-text-3">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full min-w-[8.5rem] rounded-[var(--pe-radius)] border border-pe-border-strong bg-pe-surface px-2.5 py-1.5 text-[13px] text-pe-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pe-focus)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A row of controls that wraps cleanly on narrow screens. */
export function ControlBar({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-end gap-x-5 gap-y-3">{children}</div>;
}

/** A static colour key for charts whose series are fixed (clustered/stacked bars). */
export function Key({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-pe-text-2" aria-label="Chart key">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
