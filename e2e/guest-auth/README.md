# Guest / member end-to-end checks

Real-browser and raw-HTTP checks of the access policy (`docs/access-policy.md`) against an **isolated** build of the app. They are **not** part of `npm test` (they need a built server); the unit tests in `src/lib/accessPolicy.test.ts`, `accessSurfaces.test.ts`, `appNav.test.ts` and `src/components/GlobalSearch.test.ts` cover the same rules without a server.

## Why the environment is isolated

The local `.env.local` points at the real, single Supabase project (there is no staging). Running `next build`, `next start` or `next dev` with it performs real reads and the app's own render-time cache writes against production. These checks therefore never use it:

* `isolatedRun.mts` builds the child environment with the project's `isolatedChildEnv()` (every credential replaced by a dead placeholder, fails closed), points `NEXT_PUBLIC_SUPABASE_URL` at a **loopback mock** (`mockAuth.mjs`) and aborts if any name from the env files would still be read from `.env.local`.
* `mockAuth.mjs` is a tiny stand-in for Supabase Auth with ONE test member (`member@peic.test` / `correct-horse-1`). Every other path answers `404 {"message":"mock: not found"}`.

**The "mock: not found" lines in the app's log are therefore expected here.** Pages call Supabase RPCs (CPI category breakdown, canonical SBP observations, market snapshots, weekly intelligence); the mock has no database, so each call fails and the app does what it does in production when a call fails: it logs the error and serves its static fallback. They say nothing about production data. See the G.21 report.

## Run it

```bash
# 1. the mock sign-in server (leave it running)
node e2e/guest-auth/mockAuth.mjs 54329

# 2. build and serve under isolation. Use --copy if a `next dev` is running in the project (a build replaces .next and would break it).
npx tsx --tsconfig tsconfig.json e2e/guest-auth/isolatedRun.mts build --copy
npx tsx --tsconfig tsconfig.json e2e/guest-auth/isolatedRun.mts start --copy --port 3100
npx tsx --tsconfig tsconfig.json e2e/guest-auth/isolatedRun.mts nav-json        # the navigation hrefs the browser test must find

# 3. the checks
PEIC_E2E_BASE=http://localhost:3100 node e2e/guest-auth/httpMatrix.mjs
PEIC_E2E_BASE=http://localhost:3100 node e2e/guest-auth/browserFlows.mjs 1440 900 desktop_dark dark desktop
PEIC_E2E_BASE=http://localhost:3100 node e2e/guest-auth/browserFlows.mjs 390 844 mobile_dark dark mobile
```

Environment: `PEIC_E2E_BASE` (server URL, default `http://localhost:3100`), `PEIC_E2E_OUT` (screenshots and logs, default `<tmp>/peic-e2e`), `PEIC_E2E_CHROME` (Chrome path), `PEIC_E2E_MOCK_PORT`. Stop the server and the mock afterwards, and never reuse the `.next` folder of an isolated build (the mock URL is compiled into it); `--copy` keeps it out of the project.

## What they cover

| File | Coverage |
|---|---|
| `httpMatrix.mjs` | every page and route handler that exists, as a guest / with a forged session / with a valid session; framework headers and credentials; the destination guard; machine routes keep their own authentication; an expired access token is refreshed with a valid refresh token and refused with a revoked one; `/admin/*` for a guest, an ordinary member, an administrator with an unconfirmed e-mail, an impostor who registered the administrator's e-mail (another id) and the confirmed administrator (the isolated build's `ADMIN_USER_ID` is the fake `ADMIN_TEST_USER_ID` in `constants.mjs`) |
| `browserFlows.mjs` | complete navigation for a guest (desktop menus, mobile drawer) incl. the five restored entries; the sign-in dialog (open, names the section, closes with Escape / Close / backdrop, Log in and Sign up carry the destination); GlobalSearch for protected destinations by click and Enter; direct protected URLs; invalid login; login returning to the page asked for (query kept); open-redirect attempts; logout from the desktop menu and the mobile drawer and the guest experience afterwards; a member's direct access; **account lifecycle (G.22):** sign-up -> remembered destination -> confirmation link -> lands on the destination, the same link in another browser, a wrong code, password reset (request, link, mismatch, success, no session), the callback's `next` guard, long-lived session cookie and a second tab |
| `mockAuth.mjs` | the stand-in for Supabase Auth: password login, refresh (only the known refresh token), PKCE code exchange (only `mock-valid-code` with a verifier), sign-up, recover, update user, logout; `GET /__mock/redirects` lists the `redirect_to` URLs the app sent (the exact Supabase allow-list entries, see ../../docs/authentication.md); the id, e-mail and confirmed flag inside a mock-signed token decide who `/user` reports (used to present an administrator, an unconfirmed administrator or an impostor) |

The unit tests that need no server are `src/app/auth/authFlow.test.ts` (every server action and the callback), `src/lib/accessPolicy.test.ts`, `accessSurfaces.test.ts`, `appNav.test.ts` and `src/components/GlobalSearch.test.ts`.

## Cautions

* **Never send requests to a `next dev` / `next start` that was started from the project with its real `.env.local`**: that server talks to the production Supabase and real provider keys, and every page render performs reads, paid model calls and the app's own market-snapshot cache write. Check what a server is configured for before touching it (the client bundle it serves names its Supabase host; do not print keys).
* Build in a copy (`--copy`) whenever a dev server may be running, so `.next` is not replaced underneath it.

## Manual release tests (NOT covered by the above)

The mock replaces Supabase Auth, so the following have **never been exercised against a real Supabase project** and must be tested by hand (use a real mailbox you control). The full list, the exact Supabase settings and the findings are in [docs/authentication.md](../../docs/authentication.md); in short:

1. Supabase dashboard first: **Confirm email ON** (it is reported OFF), Site URL and Redirect URLs as listed in the doc, custom SMTP, `ADMIN_USER_ID` set on Vercel, the administrator account present and yours.
2. **Sign-up confirmation e-mail** from a protected link: same browser lands on the page asked for; another browser shows the login page.
3. **Password reset** end to end.
4. **Wrong password**, **logout** (header menu and mobile drawer).
5. **Administrator** opens `/admin/system-health`; an ordinary member gets the not-found page.
