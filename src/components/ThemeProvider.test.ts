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

import { describe, it, expect, afterEach } from "vitest";
import {
  shouldAdoptRemoteTheme,
  readStoredTheme,
  writeStoredTheme,
  hasExplicitLocalThemeChoice,
  themeFromStorageEvent,
} from "./ThemeProvider";

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

  it("regression: a device that cannot read storage at all defers to the account's theme rather than throwing", () => {
    // hasExplicitLocalThemeChoice() returns false when storage is blocked
    // (see its own test below); feeding that through must adopt the remote
    // value, since a device that can't persist a choice has none to defend.
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

// --- Phase 11: storage-access hardening + cross-tab rule -------------------
// These run in Vitest's default node environment, where `localStorage` does
// not exist at all — which is itself a faithful stand-in for a browser that
// blocks site data, since both make the access throw rather than return null.

const THEME_KEY = "dashboard-theme";
const UPDATED_AT_KEY = "dashboard-theme-updated-at";

function installMemoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  });
  return data;
}

function installBlockedStorage() {
  const blocked = () => {
    throw new Error("SecurityError: access to storage is not allowed from this context");
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: { getItem: blocked, setItem: blocked, removeItem: blocked },
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis as object, "localStorage");
});

describe("theme storage access is hardened against blocked site data", () => {
  it("reads back an explicitly stored light/dark value", () => {
    installMemoryStorage({ [THEME_KEY]: "light" });
    expect(readStoredTheme()).toBe("light");
    installMemoryStorage({ [THEME_KEY]: "dark" });
    expect(readStoredTheme()).toBe("dark");
  });

  it("treats an absent or unrecognised stored value as no choice", () => {
    installMemoryStorage();
    expect(readStoredTheme()).toBeNull();
    installMemoryStorage({ [THEME_KEY]: "solarized" });
    expect(readStoredTheme()).toBeNull();
  });

  it("regression: reading returns null instead of throwing when storage is blocked", () => {
    // Previously an unguarded getItem() here threw straight out of the
    // provider's mount effect on browsers that block site data.
    installBlockedStorage();
    expect(() => readStoredTheme()).not.toThrow();
    expect(readStoredTheme()).toBeNull();
  });

  it("writing persists both the theme and this device's explicit-choice marker", () => {
    const data = installMemoryStorage();
    writeStoredTheme("light");
    expect(data.get(THEME_KEY)).toBe("light");
    expect(data.get(UPDATED_AT_KEY)).toBeDefined();
  });

  it("regression: writing does not throw when storage is blocked, so the toggle still applies", () => {
    // The important half of this fix: the throw used to abort setTheme()
    // before it reached setAttribute(), so the theme button silently did
    // nothing at all on those browsers rather than just failing to persist.
    installBlockedStorage();
    expect(() => writeStoredTheme("dark")).not.toThrow();
  });

  it("hasExplicitLocalThemeChoice reflects whether this device ever chose a theme", () => {
    installMemoryStorage();
    expect(hasExplicitLocalThemeChoice()).toBe(false);
    installMemoryStorage({ [UPDATED_AT_KEY]: "1788543809892" });
    expect(hasExplicitLocalThemeChoice()).toBe(true);
  });

  it("regression: hasExplicitLocalThemeChoice returns false instead of throwing when storage is blocked", () => {
    installBlockedStorage();
    expect(() => hasExplicitLocalThemeChoice()).not.toThrow();
    expect(hasExplicitLocalThemeChoice()).toBe(false);
  });
});

describe("themeFromStorageEvent — the cross-tab rule", () => {
  it("adopts a light/dark value written by another tab", () => {
    expect(themeFromStorageEvent(THEME_KEY, "light")).toBe("light");
    expect(themeFromStorageEvent(THEME_KEY, "dark")).toBe("dark");
  });

  it("ignores writes to any other key — an unrelated localStorage write must never move the theme", () => {
    expect(themeFromStorageEvent(UPDATED_AT_KEY, "1788543809892")).toBeNull();
    expect(themeFromStorageEvent("some-other-feature", "light")).toBeNull();
    expect(themeFromStorageEvent(null, "light")).toBeNull();
  });

  it("falls back to the app default when another tab clears the key", () => {
    expect(themeFromStorageEvent(THEME_KEY, null)).toBe("dark");
  });
});
