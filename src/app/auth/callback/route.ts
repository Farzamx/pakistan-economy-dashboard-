// Handles the link Supabase emails for signup confirmation and password
// reset (both use the same PKCE "code" exchange flow). `next` lets the
// reset-password flow land on /reset-password instead of the homepage —
// signup confirmation has no `next` param and falls back to "/".

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AFTER_AUTH_COOKIE, safeRedirectPath } from "@/lib/accessPolicy";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` comes from the URL, so it is only followed when it is a path on this site. Without one (sign-up confirmation) the page the member was trying
  // to open, remembered at sign-up, is used; otherwise the Overview.
  const jar = await cookies();
  // The password-reset e-mail lands on /reset-password (a sign-in page, which safeRedirectPath refuses as a destination), so that one value is accepted as is.
  const requested = searchParams.get("next");
  const next = requested === "/reset-password" ? requested : safeRedirectPath(requested ?? jar.get(AFTER_AUTH_COOKIE)?.value);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      jar.delete(AFTER_AUTH_COOKIE);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
