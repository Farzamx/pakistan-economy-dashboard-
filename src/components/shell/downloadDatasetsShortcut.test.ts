// The header's Download Datasets shortcut: one link to the one existing page, in the one sticky header, behind the same guest gate as every other
// protected link. UI only: nothing here (or in the shortcut) changes a route, a file or an access rule.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { requiresLogin } from "@/lib/accessPolicy";
import { APP_NAV, DOWNLOAD_DATASETS_PATH, allNavLinks } from "@/lib/appNav";
import { isProtectedPath } from "@/lib/protectedSections";
import { en } from "@/lib/i18n/translations/en";
import { rm } from "@/lib/i18n/translations/rm";
import { ur } from "@/lib/i18n/translations/ur";

const SRC = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

describe("the shortcut's destination", () => {
  it("is the existing Download Datasets page, the same one the Tools menu links to", () => {
    expect(DOWNLOAD_DATASETS_PATH).toBe("/download-datasets");
    const tools = allNavLinks(APP_NAV).find((l) => l.id === "download-datasets");
    expect(tools?.href).toBe(DOWNLOAD_DATASETS_PATH);
    expect(fs.existsSync(path.join(SRC, "app", "download-datasets", "page.tsx"))).toBe(true);
  });
  it("is still a members-only page: the shortcut grants nothing", () => {
    expect(requiresLogin(DOWNLOAD_DATASETS_PATH)).toBe(true);
    expect(isProtectedPath(DOWNLOAD_DATASETS_PATH)).toBe(true);
  });
});

describe("the app header's shortcut", () => {
  const button = read("components/shell/DownloadDatasetsButton.tsx");
  const header = read("components/shell/AppHeader.tsx");

  it("is a plain link to that page, with the full label as its accessible name and tooltip", () => {
    expect(button).toContain("href={DOWNLOAD_DATASETS_PATH}");
    expect(button).toMatch(/aria-label=\{label\}/);
    expect(button).toMatch(/title=\{label\}/);
    expect(button).toContain('t("appNav.downloadDatasets")');
    expect(button).not.toMatch(/fetch\(|router\.push|window\.location/); // navigation only; nothing is requested from here
  });
  it("runs every click through the shared guest gate, so a guest sees the usual sign-in dialog", () => {
    expect(button).toContain("onLinkClick(e, DOWNLOAD_DATASETS_PATH)");
    expect(header).toContain("<DownloadDatasetsButton onLinkClick={gate} />");
  });
  it("lives inside the existing sticky header, once, and adds no second bar", () => {
    expect(header).toMatch(/<header data-app-header className="sticky top-0 /);
    expect((header.match(/<DownloadDatasetsButton/g) ?? []).length).toBe(1);
    expect((header.match(/<header\b/g) ?? []).length).toBe(1);
    // no fixed/absolute positioning of its own: it scrolls nowhere because the bar it sits in is the thing that sticks
    expect(button.replace(/^\s*\/\/.*$/gm, "")).not.toMatch(/\bfixed\b|\babsolute\b|\bsticky\b/);
  });
  it("is rendered nowhere else in the app (no duplicate next to the one in the header)", () => {
    const users = walk(path.join(SRC, "components"))
      .concat(walk(path.join(SRC, "app")))
      .filter((f) => /\.tsx$/.test(f) && !f.endsWith("DownloadDatasetsButton.tsx"))
      .filter((f) => /<DownloadDatasetsButton/.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.basename(f));
    expect(users).toEqual(["AppHeader.tsx"]);
  });
  it("shows icon + label from 640px, icon only on the crowded 1024-1279px bar, icon + label again from 1280px, icon only on phones", () => {
    expect(button).toMatch(/hidden sm:inline lg:hidden xl:inline/);
    expect(button).toMatch(/h-9 w-9[^"]*sm:w-auto[^"]*lg:w-9[^"]*xl:w-auto/);
  });
  it("marks the current page", () => {
    expect(button).toContain('aria-current={current ? "page" : undefined}');
  });
});

describe("the marketing pages' own header", () => {
  const nav = read("components/marketing/MarketingNav.tsx");
  it("carries the same shortcut to the same page, on desktop, as an icon on phones, and in the drawer", () => {
    expect(nav).toContain('const DOWNLOAD_HREF = "/download-datasets"');
    expect((nav.match(/href=\{DOWNLOAD_HREF\}/g) ?? []).length).toBe(3);
    expect(nav).toMatch(/aria-label=\{DOWNLOAD_LABEL\}/);
  });
  it("never shares a page with the app header (the marketing routes render no app chrome)", () => {
    const chrome = read("components/ConditionalAppChrome.tsx");
    expect(chrome).toMatch(/MARKETING_PATHS = new Set\(\["\/", "\/home", "\/about", "\/contact", "\/methodology"\]\)/);
    expect(read("components/AppShell.tsx")).not.toContain("MarketingNav");
    expect(header()).not.toContain("MarketingNav");
    function header() {
      return read("components/shell/AppHeader.tsx");
    }
  });
});

describe("translations", () => {
  it("every language has the label", () => {
    for (const [name, t] of Object.entries({ en, rm, ur })) {
      expect(t.appNav.downloadDatasets, name).toBeTruthy();
    }
    expect(en.appNav.downloadDatasets).toBe("Download Datasets");
  });
});
