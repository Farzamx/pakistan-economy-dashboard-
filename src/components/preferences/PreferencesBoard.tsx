"use client";

// The interactive half of /settings/preferences. Three concerns, each
// persisted independently via PreferencesProvider.updatePreferences():
// theme, default province, and the widget board (Pinned / Visible /
// Hidden). The Pinned column uses framer-motion's Reorder primitives for
// genuine drag-to-reorder (framer-motion is already a dependency — no new
// DnD library needed); moving a widget BETWEEN columns is a button instead
// of cross-list drag, since cross-column drag-and-drop is notoriously poor
// on touch screens and this page explicitly needs mobile support.

import { useEffect, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import { usePreferences } from "@/components/PreferencesProvider";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import { DASHBOARD_WIDGETS, getWidgetLabel } from "@/lib/dashboardWidgets";
import { PROVINCES } from "@/lib/provincial/provincialBudgetRegistry";
import type { ProvinceId } from "@/data/provincialBudgetHistorical";

function SavedBadge({ saving }: { saving: boolean }) {
  return (
    <span className={`text-xs transition-opacity ${saving ? "opacity-100 text-[var(--text-muted)]" : "opacity-0"}`}>
      Saving…
    </span>
  );
}

export default function PreferencesBoard() {
  const { preferences, loading, updatePreferences } = usePreferences();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  const pinned = preferences?.favoriteIndicators ?? [];
  const hidden = preferences?.dashboardLayout?.hidden ?? [];
  const visible = DASHBOARD_WIDGETS.map((w) => w.id).filter((id) => !pinned.includes(id) && !hidden.includes(id));

  // Falls back to the first province in the registry (Punjab) when the
  // user hasn't explicitly chosen one yet, so the selector never renders
  // with nothing highlighted — a brand-new preferences row has
  // preferredProvince: null until the user actually picks one.
  const selectedProvince = preferences?.preferredProvince ?? PROVINCES[0].id;

  // One-time backfill: a real preferences row whose province was never
  // explicitly set (preferredProvince === null) gets that same default
  // written to Supabase once, so the DB matches what's already shown as
  // selected instead of silently staying out of sync. `backfilledRef`
  // guards against firing twice for the same load (e.g. Strict Mode's
  // double-invoke) — once the write resolves, `preferences.preferredProvince`
  // is no longer null, so the effect's own condition stops it from running
  // again on its own. Skipped entirely when `preferences` is null (no row
  // fetched yet) or already has a real saved value — existing users are
  // never touched.
  const backfilledRef = useRef(false);
  useEffect(() => {
    if (loading || !preferences || preferences.preferredProvince !== null) return;
    if (backfilledRef.current) return;
    backfilledRef.current = true;
    updatePreferences({ preferredProvince: PROVINCES[0].id }).catch(() => {
      // Allow a retry on the next render if this one-time write failed.
      backfilledRef.current = false;
    });
  }, [loading, preferences, updatePreferences]);

  async function persist(patch: Parameters<typeof updatePreferences>[0]) {
    setSaving(true);
    try {
      await updatePreferences(patch);
    } finally {
      setSaving(false);
    }
  }

  async function handleThemeChange(next: Theme) {
    setTheme(next);
    await persist({ preferredTheme: next });
  }

  async function handleProvinceChange(id: ProvinceId) {
    // Already selected (whether explicitly saved or just the default) —
    // clicking it again is a no-op, not a re-save.
    if (id === selectedProvince) return;
    await persist({ preferredProvince: id });
  }

  async function pin(id: string) {
    await persist({ favoriteIndicators: [...pinned, id], dashboardLayout: { hidden: hidden.filter((h) => h !== id) } });
  }

  async function hide(id: string) {
    await persist({ dashboardLayout: { hidden: [...hidden, id] }, favoriteIndicators: pinned.filter((p) => p !== id) });
  }

  async function unpin(id: string) {
    await persist({ favoriteIndicators: pinned.filter((p) => p !== id) });
  }

  async function unhide(id: string) {
    await persist({ dashboardLayout: { hidden: hidden.filter((h) => h !== id) } });
  }

  async function reorderPinned(newOrder: string[]) {
    await persist({ favoriteIndicators: newOrder });
  }

  if (loading) {
    return <div className="mt-8 h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-hidden="true" />;
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      <div className="flex items-center justify-end">
        <SavedBadge saving={saving} />
      </div>

      {/* Theme */}
      <section>
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Theme</h2>
        <div className="flex gap-2.5">
          {(["dark", "light"] as Theme[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleThemeChange(t)}
              aria-pressed={theme === t}
              className={`rounded-xl border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                theme === t
                  ? "border-neon-blue/40 bg-neon-blue/15 text-neon-blue"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {t} Mode
            </button>
          ))}
        </div>
      </section>

      {/* Default province */}
      <section>
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Default Province</h2>
        <div className="flex flex-wrap gap-2.5">
          {PROVINCES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProvinceChange(p.id)}
              aria-pressed={selectedProvince === p.id}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                selectedProvince === p.id ? "border-transparent text-white" : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
              style={selectedProvince === p.id ? { backgroundColor: p.color } : undefined}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* Widget board */}
      <section>
        <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Dashboard Sections</h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Drag to reorder Pinned indicators — they&apos;ll appear first on your homepage. Hidden sections won&apos;t render at all.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Pinned — drag to reorder */}
          <div className="rounded-xl border border-neon-blue/20 bg-neon-blue/5 p-3">
            <p className="mb-2 text-xs font-semibold text-neon-blue">Pinned ({pinned.length})</p>
            <Reorder.Group axis="y" values={pinned} onReorder={reorderPinned} className="flex flex-col gap-1.5">
              {pinned.map((id) => (
                <Reorder.Item
                  key={id}
                  value={id}
                  className="flex cursor-grab items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm active:cursor-grabbing"
                >
                  <span className="text-[var(--text-primary)]">{getWidgetLabel(id)}</span>
                  <button type="button" onClick={() => unpin(id)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    Unpin
                  </button>
                </Reorder.Item>
              ))}
              {pinned.length === 0 && <p className="text-xs text-[var(--text-muted)]">No pinned sections yet.</p>}
            </Reorder.Group>
          </div>

          {/* Visible (default) */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Visible ({visible.length})</p>
            <div className="flex flex-col gap-1.5">
              {visible.map((id) => (
                <div key={id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm">
                  <span className="text-[var(--text-primary)]">{getWidgetLabel(id)}</span>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => pin(id)} className="text-xs text-neon-blue hover:underline">
                      Pin
                    </button>
                    <button type="button" onClick={() => hide(id)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      Hide
                    </button>
                  </div>
                </div>
              ))}
              {visible.length === 0 && <p className="text-xs text-[var(--text-muted)]">Nothing left here.</p>}
            </div>
          </div>

          {/* Hidden */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 opacity-70">
            <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Hidden ({hidden.length})</p>
            <div className="flex flex-col gap-1.5">
              {hidden.map((id) => (
                <div key={id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm">
                  <span className="text-[var(--text-secondary)]">{getWidgetLabel(id)}</span>
                  <button type="button" onClick={() => unhide(id)} className="shrink-0 text-xs text-neon-blue hover:underline">
                    Show
                  </button>
                </div>
              ))}
              {hidden.length === 0 && <p className="text-xs text-[var(--text-muted)]">Nothing hidden.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
