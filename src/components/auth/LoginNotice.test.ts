// The login page's two notices (G.23): a failed e-mail link, and a finished password change. They are shown for the exact values the app itself sends, never for
// arbitrary query text, in all three languages, and they do not disturb the existing messages or the form.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/components/LanguageProvider";
import LoginForm, { type LoginNotice } from "./LoginForm";
import { en } from "@/lib/i18n/translations/en";
import { rm } from "@/lib/i18n/translations/rm";
import { ur } from "@/lib/i18n/translations/ur";

const render = (notice: LoginNotice | undefined, confirmed = false) =>
  renderToStaticMarkup(createElement(LanguageProvider, null, createElement(LoginForm, { redirectTo: "/budget", confirmed, notice })));
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

describe("LoginForm notices", () => {
  it("a plain visit shows no notice", () => {
    const html = render(undefined);
    expect(html).not.toContain("login-notice-");
    expect(html).toContain('name="email"');
  });

  it("a failed e-mail link shows the callback-failure message (and only that notice)", () => {
    const html = render("callback-failed");
    expect(html).toContain('data-testid="login-notice-callback-failed"');
    expect(html).toContain('role="alert"');
    expect(decode(html)).toContain(en.auth.callbackFailed);
    expect(html).not.toContain("login-notice-password-updated");
  });

  it("a finished password change shows the confirmation (and only that notice)", () => {
    const html = render("password-updated");
    expect(html).toContain('data-testid="login-notice-password-updated"');
    expect(html).toContain('role="status"');
    expect(decode(html)).toContain(en.auth.passwordUpdated);
    expect(html).not.toContain("login-notice-callback-failed");
  });

  it("the form, the forgot-password link, the destination and the existing 'account created' message are unchanged", () => {
    const html = render("callback-failed", true);
    expect(html).toContain('name="redirectTo" value="/budget"');
    expect(html).toContain('name="password"');
    expect(html).toContain('href="/forgot-password"');
    expect(decode(html)).toContain(en.auth.accountCreated);
  });

  it("neither message reveals authentication internals (no error code, token, provider text or address)", () => {
    for (const lang of [en, rm, ur]) {
      for (const text of [lang.auth.callbackFailed, lang.auth.passwordUpdated]) {
        expect(text.length).toBeGreaterThan(20);
        expect(text).not.toMatch(/auth-callback-failed|invalid flow state|code_verifier|PKCE|token|supabase|@/i);
      }
    }
  });

  it("both messages exist in English, Roman Urdu and Urdu", () => {
    for (const lang of [en, rm, ur]) {
      expect(lang.auth.callbackFailed).toBeTruthy();
      expect(lang.auth.passwordUpdated).toBeTruthy();
    }
    expect(new Set([en.auth.callbackFailed, rm.auth.callbackFailed, ur.auth.callbackFailed]).size).toBe(3);
    expect(new Set([en.auth.passwordUpdated, rm.auth.passwordUpdated, ur.auth.passwordUpdated]).size).toBe(3);
  });
});

describe("the login page chooses the notice only from exact values", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "..", "..", "app", "login", "page.tsx"), "utf8");

  it("maps error=auth-callback-failed and reset=1 and nothing else", () => {
    expect(src).toContain('params.error === "auth-callback-failed" ? "callback-failed" : params.reset === "1" ? "password-updated" : null');
    expect(src).toContain("notice={notice}");
  });

  it("never echoes the raw query text into the page", () => {
    expect(src).not.toMatch(/\{params\.(error|reset)\}/);
  });

  it("keeps the validated return destination", () => {
    expect(src).toContain("safeRedirectPath(params.redirect)");
  });
});
