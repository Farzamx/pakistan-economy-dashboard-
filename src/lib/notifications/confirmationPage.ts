// Shared HTML renderer for the subscriber-facing confirmation pages
// (verify, unsubscribe) — these are opened directly in a browser from an
// emailed link, not rendered by the Next.js app shell, so a minimal
// self-contained HTML response (not a full React page) is the right scope:
// no Sidebar/layout dependency, just enough styling to feel like part of
// the same premium product rather than a bare error page. Colors/spacing
// match the dashboard's Galaxy theme and the alert email template
// (alertEmailTemplate.ts) for a consistent feel across every subscriber
// touchpoint.

export interface ConfirmationPageOptions {
  icon: string;
  title: string;
  message: string;
  success: boolean;
  buttonLabel?: string;
  buttonHref?: string;
}

export function renderConfirmationPage(opts: ConfirmationPageOptions): string {
  const accent = opts.success ? "#38bdf8" : "#fb7185";
  const button = opts.buttonLabel && opts.buttonHref
    ? `<a href="${opts.buttonHref}" class="btn">${opts.buttonLabel}</a>`
    : `<a href="https://pakeconintel.com/economic-calendar" class="link">Back to the Economic Calendar</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${opts.title} — Pakistan Economic Intelligence</title>
<style>
  @media (prefers-reduced-motion: no-preference) {
    .card { animation: fadeUp 0.5s ease-out; }
  }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #05060f; color: #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; }
  .card { max-width: 440px; width: 100%; text-align: center; padding: 40px 32px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); background: #0b0d18; box-shadow: 0 0 32px rgba(56,189,248,0.08); }
  .icon { font-size: 40px; line-height: 1; margin-bottom: 16px; }
  .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #38bdf8; margin: 0 0 10px; }
  h1 { font-size: 21px; margin: 0 0 10px; color: ${accent}; font-weight: 700; }
  p { font-size: 14px; line-height: 1.6; color: #9ca3af; margin: 0; }
  .btn { display: inline-block; margin-top: 24px; padding: 13px 28px; border-radius: 10px; background: #38bdf8; color: #05060f; font-weight: 700; font-size: 14px; text-decoration: none; }
  .btn:focus-visible { outline: 2px solid #38bdf8; outline-offset: 3px; }
  .link { display: inline-block; margin-top: 20px; font-size: 13px; color: #6b7280; text-decoration: underline; }
  .link:focus-visible { outline: 2px solid #38bdf8; outline-offset: 3px; }
</style>
</head>
<body>
  <main class="card" role="main">
    <p class="eyebrow">Pakistan Economic Intelligence</p>
    <div class="icon" aria-hidden="true">${opts.icon}</div>
    <h1>${opts.title}</h1>
    <p>${opts.message}</p>
    ${button}
  </main>
</body>
</html>`;
}
