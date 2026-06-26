"use client";

// CRUD layer for the user_preferences table (supabase/migrations/0001_user_preferences.sql).
// Runs entirely through the browser client + the user's own authenticated
// session — RLS (auth.uid() = user_id) is what actually keeps this safe,
// not anything in this file, so there's no need to filter by user_id here
// the way you would without RLS. Every write goes straight to Supabase
// (no localStorage layer) so a second device always sees the latest state
// on its next fetch — that's the whole mechanism behind "sync across
// devices," not anything more elaborate.

import { createClient } from "@/lib/supabase/client";
import type { ProvinceId } from "@/data/provincialBudgetHistorical";

export interface DashboardLayout {
  hidden: string[];
}

export interface UserPreferences {
  id: string;
  userId: string;
  favoriteIndicators: string[];
  dashboardLayout: DashboardLayout;
  preferredProvince: ProvinceId | null;
  preferredTheme: "dark" | "light" | null;
  createdAt: string;
  updatedAt: string;
}

interface UserPreferencesRow {
  id: string;
  user_id: string;
  favorite_indicators: string[] | null;
  dashboard_layout: DashboardLayout | null;
  preferred_province: string | null;
  preferred_theme: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: UserPreferencesRow): UserPreferences {
  return {
    id: row.id,
    userId: row.user_id,
    favoriteIndicators: row.favorite_indicators ?? [],
    // The migration's column default is '{}'::jsonb, not null — every row
    // created without an explicit dashboardLayout patch (e.g. a brand-new
    // signup, or a user who only ever touched theme/province/pins) has
    // dashboard_layout = {} in the DB. {} is truthy, so `row.dashboard_layout
    // ?? { hidden: [] }` alone doesn't catch it and silently produces a
    // dashboardLayout with no `hidden` array — the exact root cause of a
    // production crash (HideableSection.tsx's `.hidden.includes(id)`
    // throwing "Cannot read properties of undefined"). Reading `.hidden`
    // explicitly, with its own fallback, normalizes both shapes the same way.
    dashboardLayout: { hidden: row.dashboard_layout?.hidden ?? [] },
    preferredProvince: (row.preferred_province as ProvinceId | null) ?? null,
    preferredTheme: (row.preferred_theme as "dark" | "light" | null) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getUserPreferences(): Promise<UserPreferences | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("user_preferences").select("*").maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as UserPreferencesRow) : null;
}

export interface PreferencesPatch {
  favoriteIndicators?: string[];
  dashboardLayout?: DashboardLayout;
  preferredProvince?: ProvinceId | null;
  preferredTheme?: "dark" | "light" | null;
}

// Only the fields present in `patch` are written — upsert's ON CONFLICT
// clause only SETs the columns included in the payload, so omitted fields
// (e.g. favoriteIndicators when only changing the theme) are left exactly
// as they were rather than reset to a default.
export async function upsertUserPreferences(userId: string, patch: PreferencesPatch): Promise<UserPreferences> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { user_id: userId };
  if (patch.favoriteIndicators !== undefined) payload.favorite_indicators = patch.favoriteIndicators;
  if (patch.dashboardLayout !== undefined) payload.dashboard_layout = patch.dashboardLayout;
  if (patch.preferredProvince !== undefined) payload.preferred_province = patch.preferredProvince;
  if (patch.preferredTheme !== undefined) payload.preferred_theme = patch.preferredTheme;

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as UserPreferencesRow);
}
