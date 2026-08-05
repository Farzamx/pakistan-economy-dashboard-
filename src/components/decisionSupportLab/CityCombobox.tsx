"use client";

// Section B3: a searchable combobox over PBS-surveyed cities. Free typing
// is still allowed (a user's city may not be in the list) — selecting a
// listed city additionally auto-fills Province via onSelectCity, which is
// the only thing this component adds over a plain text input.
import { useId, useMemo, useRef, useState } from "react";
import { PAKISTAN_CITIES, type PakistanCity } from "@/data/pakistanCities";

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelectCity: (city: PakistanCity) => void;
  placeholder?: string;
}

export default function CityCombobox({ id, value, onChange, onSelectCity, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q === "") return PAKISTAN_CITIES.slice(0, 8);
    return PAKISTAN_CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [value]);

  function selectCity(city: PakistanCity) {
    onChange(city.name);
    onSelectCity(city);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (matches[activeIndex]) {
        e.preventDefault();
        selectCity(matches[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
      />
      {open && matches.length > 0 && (
        <ul id={listboxId} role="listbox" className="glass-card absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--border-subtle)] py-1 shadow-xl">
          {matches.map((city, i) => (
            <li key={city.name}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCity(city)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                  i === activeIndex ? "bg-neon-blue/10 text-neon-blue" : "text-white/80 light:text-slate-700"
                }`}
              >
                <span>{city.name}</span>
                {city.province && <span className="text-[11px] uppercase tracking-wide text-white/30 light:text-slate-400">{city.province}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
