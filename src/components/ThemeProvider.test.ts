// Phase 10.8 theme-persistence regression tests. Covers shouldAdoptRemoteTheme,
// the pure decision function PreferencesProvider calls to decide whether a
// DB-stored theme should override this device's current theme. The bug this
// guards against: an earlier version compared a whole-row `updated_at`
// timestamp against this device's last local-write time, which an unrelated
// preference write (province, favorites, dashboard layout) could advance
// past the theme write's own timestamp — silently reverting an explicit
// Light/Dark choice with no user action. The fix removes the timestamp race
// entirely: a remote value is only ever adopted when this device has never
// recorded an explicit local theme choice.

import { describe, it, expect } from "vitest";
import { shouldAdoptRemoteTheme } from "./ThemeProvider";

describe("shouldAdoptRemoteTheme", () => {
  it("adopts the remote theme for a brand-new device with no local write and a differing remote value", () => {
    expect(
      shouldAdoptRemoteTheme({
        hasUser: true,
        remoteTheme: "light",
        themeAtFetchStart: "dark",
        currentTheme: "dark",
        hasLocalWrite: false,
      }),
    ).toBe(true);
  });

  it("does NOT adopt the remote theme once this device has any recorded explicit local write — the core Phase 10.8 fix", () => {
    expect(
      shouldAdoptRemoteTheme({
        hasUser: true,
        remoteTheme: "dark",
        themeAtFetchStart: "light",
        currentTheme: "light",
        hasLocalWrite: true,
      }),
    ).toBe(false);
  });

  it("does not adopt when signed out (no user, nothing to sync from)", () => {
    expect(
      shouldAdoptRemoteTheme({
        hasUser: false,
        remoteTheme: "light",
        themeAtFetchStart: "dark",
        currentTheme: "dark",
        hasLocalWrite: false,
      }),
    ).toBe(false);
  });

  it("does not adopt when there is no remote theme recorded yet", () => {
    expect(
      shouldAdoptRemoteTheme({
        hasUser: true,
        remoteTheme: null,
        themeAtFetchStart: "dark",
        currentTheme: "dark",
        hasLocalWrite: false,
      }),
    ).toBe(false);
  });

  it("does not adopt when the remote theme already matches the local theme (nothing to reconcile)", () => {
    expect(
      shouldAdoptRemoteTheme({
        hasUser: true,
        remoteTheme: "dark",
        themeAtFetchStart: "dark",
        currentTheme: "dark",
        hasLocalWrite: false,
      }),
    ).toBe(false);
  });

  it("does not adopt when the user toggled the theme while the fetch was still in flight", () => {
    // themeAtFetchStart was "dark" when the fetch began, but the live theme
    // has since moved to "light" — a toggle that happened mid-flight must
    // win over whatever the in-flight fetch resolves to.
    expect(
      shouldAdoptRemoteTheme({
        hasUser: true,
        remoteTheme: "dark",
        themeAtFetchStart: "dark",
        currentTheme: "light",
        hasLocalWrite: false,
      }),
    ).toBe(false);
  });

  it("regression: an unrelated preference write must never resurrect a stale DB theme on a device with its own explicit choice", () => {
    // This is the exact production scenario: the device explicitly chose
    // "light" (hasLocalWrite: true) and the DB still has an older "dark"
    // from before that choice (e.g. a sync that never completed). A later,
    // fully unrelated preference write elsewhere bumped the row's
    // updated_at — but that must be irrelevant now that the timestamp race
    // has been removed entirely.
    expect(
      shouldAdoptRemoteTheme({
        hasUser: true,
        remoteTheme: "dark",
        themeAtFetchStart: "light",
        currentTheme: "light",
        hasLocalWrite: true,
      }),
    ).toBe(false);
  });
});
