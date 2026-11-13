// A throwaway stand-in for Supabase Auth (GoTrue), LOOPBACK ONLY, so the real sign-in flow can be driven end to end WITHOUT touching any real Supabase project.
// It knows ONE test member (member@peic.test / correct-horse-1). Anything else is refused. Every other path answers 404 JSON, so the app falls back to its
// static data exactly as it does when a database call fails (that is what the "mock: not found" lines in the app's log are: see README).
// Request lines (method + path, never tokens or passwords) are appended to the file named by PEIC_E2E_MOCK_LOG (default: the OS temp directory).
//
//   node e2e/guest-auth/mockAuth.mjs [port]        (default 54329)
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.argv[2] ?? 54329);
const LOG = process.env.PEIC_E2E_MOCK_LOG ?? path.join(os.tmpdir(), "peic-e2e-mock-auth.log");
export const MEMBER = { email: "member@peic.test", password: "correct-horse-1" };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = () => Math.floor(Date.now() / 1000);
const USER = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: MEMBER.email, email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
// A JWT-shaped token that ends in ".mocksig": the only kind the /user endpoint accepts (so a forged cookie is refused, as real Supabase would).
const mintToken = (email = USER.email) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER.id, aud: "authenticated", role: "authenticated", email, exp: now() + 3600 })}.mocksig`;
/** The user a mock-signed token stands for (the e-mail is read from its payload: tests use it to present an administrator). */
const userFromToken = (tok) => {
  try {
    const p = JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString("utf8"));
    // id (sub), e-mail and whether the e-mail is confirmed all come from the payload, so a test can present an administrator, an unconfirmed administrator, or an
    // impostor who registered the administrator's address (a different id).
    return { ...USER, id: p.sub ?? USER.id, email: p.email ?? USER.email, email_confirmed_at: p.confirmed === false ? null : USER.email_confirmed_at };
  } catch { return USER; }
};
// The redirect_to values the app sends with sign-up and password-reset requests: these are exactly the URLs Supabase's allow-list must accept (GET /__mock/redirects).
const REDIRECTS = [];
export const VALID_CODE = "mock-valid-code";
const session = () => ({ access_token: mintToken(), token_type: "bearer", expires_in: 3600, expires_at: now() + 3600, refresh_token: "mock-refresh", user: USER });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  fs.appendFileSync(LOG, `${new Date().toISOString()} ${req.method} ${url.pathname}${url.searchParams.get("grant_type") ? "?grant_type=" + url.searchParams.get("grant_type") : ""}\n`);
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    // the browser-side Supabase client calls this origin directly, so it needs CORS
    const cors = {
      "access-control-allow-origin": req.headers.origin ?? "*",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "authorization,apikey,content-type,x-client-info,x-supabase-api-version",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    };
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    if (req.method === "GET" && url.pathname === "/__mock/redirects") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(REDIRECTS)); }
    const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json", ...cors }); res.end(obj === null ? "" : JSON.stringify(obj)); };

    if (req.method === "GET" && url.pathname === "/auth/v1/user") {
      const tok = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
      return tok && tok.split(".").length === 3 && tok.endsWith(".mocksig") ? send(200, userFromToken(tok)) : send(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    }
    if (req.method === "POST" && url.pathname === "/auth/v1/token") {
      const grant = url.searchParams.get("grant_type");
      if (grant === "refresh_token") {
        let b = {}; try { b = JSON.parse(body); } catch { /* not JSON */ }
        return b.refresh_token === "mock-refresh" ? send(200, session()) : send(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token: Refresh Token Not Found" });
      }
      if (grant === "pkce") {
        // the code a confirmation / reset e-mail link carries; only VALID_CODE is accepted (a wrong, used or expired code is refused as Supabase does)
        let b = {}; try { b = JSON.parse(body); } catch { /* not JSON */ }
        return b.auth_code === VALID_CODE && b.code_verifier ? send(200, session()) : send(400, { code: 400, error_code: "validation_failed", msg: "invalid flow state, no valid flow state found" });
      }
      if (grant === "password") {
        let b = {}; try { b = JSON.parse(body); } catch { /* not JSON */ }
        return b.email === MEMBER.email && b.password === MEMBER.password ? send(200, session()) : send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      }
      return send(400, { code: 400, error_code: "bad_grant", msg: "unsupported" });
    }
    if (req.method === "POST" && url.pathname === "/auth/v1/recover") { REDIRECTS.push({ flow: "recover", redirect_to: url.searchParams.get("redirect_to") }); return send(200, {}); }
    if (req.method === "PUT" && url.pathname === "/auth/v1/user") {
      const tok = (req.headers.authorization ?? "").replace(/^Bearers+/i, "");
      return tok.split(".").length === 3 && tok.endsWith(".mocksig") ? send(200, USER) : send(401, { code: 401, error_code: "no_authorization", msg: "Auth session missing" });
    }
    if (req.method === "POST" && url.pathname === "/auth/v1/signup") REDIRECTS.push({ flow: "signup", redirect_to: url.searchParams.get("redirect_to") });
    if (req.method === "POST" && url.pathname === "/auth/v1/signup") return send(200, { ...USER, id: "22222222-2222-4222-8222-222222222222", email: "new@peic.test", email_confirmed_at: null, confirmation_sent_at: new Date().toISOString() });
    if (url.pathname === "/auth/v1/logout") return send(204, null);
    return send(404, { code: 404, message: "mock: not found" });
  });
});
server.listen(PORT, "127.0.0.1", () => console.log(`mock auth listening on 127.0.0.1:${PORT} (log: ${LOG})`));
