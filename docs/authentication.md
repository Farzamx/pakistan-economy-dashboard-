# Authentication: how it works, what Supabase and Vercel must be set to, and what is still untested

Companion to [access-policy.md](access-policy.md) (who may open what). This page covers the account flows themselves and the **Supabase and Vercel settings they depend on**. Status as of G.23 (13 Nov 2026): implemented and tested locally against a loopback mock; **the real Supabase project's behaviour (confirmation e-mails, redirect allow-list, SMTP) has not been exercised**, and none of the settings below has been changed by this work.

## 1. The flows

| Flow | Code | What happens |
|---|---|---|
| Sign-up | `signUp` in `src/app/auth/actions.ts`, `/signup` | Validates (passwords match, at least 8 characters), calls `auth.signUp` with `emailRedirectTo = <site>/auth/callback`. The page the visitor asked for is kept in the `peic_after_auth` cookie (httpOnly, SameSite=Lax, 1 hour, Secure in production) and the member is sent to `/login?confirm=1&redirect=<page>`. |
| Confirmation e-mail link | `GET /auth/callback` | Exchanges the one-time `code` for a session (PKCE: only works in the browser that started the flow), then redirects to `next`, else the remembered page, else `/overview`. A bad, used, expired or other-browser code goes to `/login?error=auth-callback-failed`, which **explains** it (G.23): the link is invalid, has expired, or was opened in a different browser; if the address was just confirmed, log in below, otherwise request a new link. |
| Login | `signIn`, `/login` | `signInWithPassword`; a wrong password returns Supabase's message and stays on the page; success redirects to the validated `redirect` (query kept), else `/overview`. |
| Password reset | `requestPasswordReset`, `/forgot-password`; `/auth/callback?next=/reset-password`; `updatePassword`, `/reset-password` | The request always shows the same neutral message. The link signs the member in (recovery session) and lands on `/reset-password`; a valid new password is saved, **the reset session is ended (everywhere)**, and the member is taken to `/login?reset=1`, which shows "Your password has been updated. Log in with your new password." (G.23). |
| Logout | `signOutAction` + the client sign-out (`useSignOutFlow`) | Clears the session cookies on the server and in the browser; protected pages close again. |
| Session | `src/proxy.ts` -> `src/lib/supabase/proxy.ts` | Every page request refreshes the session (`auth.getUser()` validates the token with Supabase and refreshes an expired access token with the refresh token); a request with no `sb-…-auth-token` cookie never calls Supabase. If Supabase cannot be reached, protected pages stay closed. The cookie is long-lived (about 400 days), SameSite=Lax, path `/`. |
| Protected pages | `accessPolicy.ts` + the proxy | See access-policy.md. A guest is sent to `/login?redirect=<page>`; data routes answer 401. |
| Return to the requested page | `safeRedirectPath()` | Only a path on this site is followed; anything else becomes `/overview`. Applied in `/login`, `/signup`, `signIn`, `signUp` and `/auth/callback`. |
| **Administrator** | `requireAdmin()` in `src/lib/adminAccess.ts`, used by `/admin/system-health` and `/admin/sync-status` | **All three must hold** (G.23): (1) a signed-in Supabase user (validated with the Auth server); (2) a **confirmed e-mail** (`email_confirmed_at` set); (3) the user's **id equals the server-side `ADMIN_USER_ID`**. A guest is redirected to `/login?redirect=<page>`; anyone else gets the ordinary not-found page; it **fails closed** (nobody is an administrator) if `ADMIN_USER_ID` is unset or not a UUID. The e-mail address is **not** used to grant access. `/api/admin/*` use `CRON_SECRET`, not a session. |

There is no paid tier, plan or role: being signed in is the only entitlement for members (see access-policy.md); the administrator is a separate, id-based check.

## 2. Settings to apply (none has been changed by this work)

### 2.1 Vercel: `ADMIN_USER_ID` (must be set with the release, or the admin pages answer 404 to everyone)

| Item | Value |
|---|---|
| Name | `ADMIN_USER_ID` (a plain server variable: **never** `NEXT_PUBLIC_*`) |
| Value | The administrator's Supabase **user id**: Supabase dashboard → **Authentication → Users** → open the administrator's account → copy **User UID** (a UUID such as `xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx`). The id is not invented or stored anywhere in this repository. |
| Where | Vercel → Project → **Settings → Environment Variables** → add for **Production** (and Preview if previews should offer the admin pages); locally in `.env.local` (never committed). A new variable only takes effect for **new deployments**. |
| Related | `ADMIN_EMAIL` is still needed, but only as the recipient of the watchdog's alert e-mails (`src/lib/ingestionWatchdog.ts`); it no longer authorizes anything. |
| Check | After deploying, the administrator opens `/admin/system-health` (must work); a different signed-in account gets the not-found page. |

The id is read only in `src/lib/adminAccess.ts` at request time, is never logged, never returned to the browser and never part of client code (tests enforce all three).

### 2.2 Supabase: URL configuration (**Authentication → URL Configuration**)

The app asks Supabase to send e-mail links to **exactly** these addresses (recorded from the code by `authFlow.test.ts` and the end-to-end run; `<site>` is the host the visitor used, `https://www.pakeconintel.com` in production):

| Flow | `redirect_to` the app sends |
|---|---|
| Sign-up confirmation | `https://www.pakeconintel.com/auth/callback` |
| Password reset | `https://www.pakeconintel.com/auth/callback?next=/reset-password` |

| Setting | Required value |
|---|---|
| Site URL | `https://www.pakeconintel.com` |
| Redirect URLs (allow-list) | `https://www.pakeconintel.com/auth/callback` and `https://www.pakeconintel.com/auth/callback?next=/reset-password`, **plus the wildcard** `https://www.pakeconintel.com/**` (a link whose URL is not on the list falls back to the Site URL and the code is never exchanged; the wildcard also covers the reset link's query string, whose exact-match handling varies by version, so confirm it with manual test 4) |
| Development (optional) | `http://localhost:3000/**` |
| Previews (optional) | `https://*-farzam-arif-s-projects.vercel.app/**` (the host comes from the request, so a preview deployment sends its own address) |

`pakeconintel.com` (no `www`) answers 308 to the `www` host before any page runs, so it is not needed.

### 2.3 Supabase: e-mail provider and SMTP (**Authentication → Providers → Email**, **Emails / SMTP**)

| Setting | Required value | Why |
|---|---|---|
| **Confirm email** | **ON** | See finding 1: it is reported OFF today. |
| **Custom SMTP** (for example Resend) | configured, sender domain verified, a sensible from-address | Supabase's built-in mailer is for testing: very low hourly limits and restricted recipients, so sign-up and reset e-mails will not arrive reliably without it. Required before Confirm email is turned ON, or new members cannot finish signing up. |
| Email templates (Confirm signup, Reset password) | keep the default link `{{ .ConfirmationURL }}` | The app has no `/auth/confirm` token-hash route; only the redirect-with-code flow is implemented. |
| Minimum password length | 8 or more | The forms enforce 8; Supabase should not be looser. |
| Refresh-token rotation | ON (default) | Limits replay of a stolen refresh token. |
| Bot protection (CAPTCHA) on sign-up | recommended | Sign-up is open to anyone and is the only gate to the members' pages. |

**What I could and could not check.** I cannot read the project's dashboard, so the allow-list, templates and SMTP are **unverified**. One public, unauthenticated request to the project's Auth settings endpoint (the same one any browser may call) reported: e-mail sign-in enabled, sign-ups open, no other providers, and **e-mail auto-confirm enabled** (finding 1). No account was created and no e-mail was sent.

## 3. Findings and their status

1. **High — "Confirm email" is OFF in production (open: needs your dashboard action).** Supabase reports auto-confirm enabled, so a new account is signed in immediately with whatever e-mail address was typed, with no proof that it belongs to the person.
   * The administrator is now identified by **user id**, so registering the administrator's address no longer grants access (fixed in code, G.23). While Confirm email is OFF, `email_confirmed_at` is set automatically at sign-up, so the "confirmed e-mail" requirement adds protection only after Confirm email is turned ON; the id check is what protects today.
   * The "check your email to confirm" wording is untrue until Confirm email is ON: the sign-up returns a session at once and the new member lands directly on the page they asked for (the login page forwards a signed-in visitor; the leftover `peic_after_auth` cookie expires after an hour).
   * Turning it ON requires the custom SMTP and the allow-list in 2.2 and 2.3. The members' area is a registration wall, not an identity check, in either mode.
2. **Medium — administrator identified by e-mail string: FIXED (G.23)** (id + confirmed e-mail; fails closed).
3. **Low — missing messages: FIXED (G.23)** for a failed e-mail link and for a finished password change.
4. **Low — session cookie attributes (open, optional).** The Supabase library sets the session cookie as SameSite=Lax, path `/`, about 400 days, **not httpOnly** (the browser client must read it) and without `Secure` unless configured; on HTTPS with HSTS the browser still only sends it over HTTPS. Setting `cookieOptions.secure` in the three client factories would add the flag.
5. **Info — PKCE.** A confirmation or reset link only completes in the browser that requested it (the code-verifier cookie); elsewhere the new message explains it.
6. **Info — proxy cost.** Signed-in page requests cost one Supabase round trip each (as at `04acfd4`); anonymous requests cost none.

## 4. Test coverage

| Layer | File | Covers |
|---|---|---|
| Unit (npm test) | `src/lib/adminAccess.test.ts` | every administrator combination (guest, ordinary user, unconfirmed administrator, impostor with the administrator's e-mail, unset or malformed `ADMIN_USER_ID`), the guard's outcomes, both pages wired to it, the id read in one file only and never in client code |
| Unit (npm test) | `src/app/auth/authFlow.test.ts` | every server action and the callback: wrong password, destination validation, sign-up cookie and `emailRedirectTo`, reset `redirectTo`, password change (and sign-out), logout, callback code handling and `next` guard |
| Unit (npm test) | `src/components/auth/LoginNotice.test.ts` | the two login notices: exact values only, three languages, nothing sensitive, form unchanged |
| Unit (npm test) | `src/lib/accessPolicy.test.ts`, `accessSurfaces.test.ts` | proxy decisions with a faked Supabase (guest, member, forged, unreachable), every route, the redirect guard |
| End to end (isolated, `e2e/guest-auth/`) | `httpMatrix.mjs` | all routes as guest / forged / valid session; expired access token refreshed, revoked refresh token refused; `/admin/*` for guest, ordinary member, unconfirmed administrator, impostor and the confirmed administrator |
| End to end (isolated) | `browserFlows.mjs` | navigation, dialog, search, login, logout, sign-up → callback → destination, other-browser link **with its message**, wrong code, password reset **with its confirmation**, reset without a session, callback `next` guard, cookie persistence; desktop and mobile |

## 5. Manual release tests (real project, a mailbox you control; not yet done)

1. **Vercel**: `ADMIN_USER_ID` set for Production (value copied from Authentication → Users), then redeployed.
2. **Supabase dashboard**: Confirm email ON, Site URL and Redirect URLs as in 2.2, custom SMTP configured and a test e-mail delivered, the administrator account present and yours (look for look-alike accounts).
3. **Administrator**: the administrator opens `/admin/system-health` and `/admin/sync-status`; a normal member gets the not-found page; signed out, the URL goes to login and returns after signing in.
4. **Password reset**: Forgot password → e-mail arrives → link → new password → the login page says the password was updated → log in with the new password. (This also proves the allow-list accepts the `?next=/reset-password` address.)
5. **Sign-up confirmation** from a protected link (Bond Yields): the e-mail arrives; opened in the **same** browser it signs in and lands on Bond Yields; opened in a **different** browser it shows the login page with the explanatory message, and the password then works.
6. Wrong password shows Supabase's message; logout from the header menu and from the mobile drawer; protected pages close.
7. Sign-up and reset e-mails come from the intended sender and are not marked as spam.
