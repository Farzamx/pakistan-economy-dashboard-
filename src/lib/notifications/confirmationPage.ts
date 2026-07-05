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
  /** Short line directly under the title — e.g. "Welcome to Pakistan Economic Intelligence Alerts". */
  subtitle?: string;
  message: string;
  /** Optional bullet list — e.g. the categories of releases a fresh subscriber will now receive. */
  features?: string[];
  success: boolean;
  buttonLabel?: string;
  buttonHref?: string;
  secondaryButtonLabel?: string;
  secondaryButtonHref?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderConfirmationPage(opts: ConfirmationPageOptions): string {
  const accent = opts.success ? "#38bdf8" : "#fb7185";

  const featuresHtml = opts.features?.length
    ? `<ul class="features">${opts.features.map((f) => `<li><span aria-hidden="true">&#10003;</span>${escapeHtml(f)}</li>`).join("")}</ul>`
    : "";

  const buttons: string[] = [];
  if (opts.buttonLabel && opts.buttonHref) buttons.push(`<a href="${opts.buttonHref}" class="btn btn-primary">${escapeHtml(opts.buttonLabel)}</a>`);
  if (opts.secondaryButtonLabel && opts.secondaryButtonHref) buttons.push(`<a href="${opts.secondaryButtonHref}" class="btn btn-secondary">${escapeHtml(opts.secondaryButtonLabel)}</a>`);
  if (buttons.length === 0) buttons.push(`<a href="https://www.pakeconintel.com/economic-calendar" class="link">Back to the Economic Calendar</a>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(opts.title)} — Pakistan Economic Intelligence</title>
<style>
  @media (prefers-reduced-motion: no-preference) {
    .card { animation: fadeUp 0.5s ease-out; }
    .icon { animation: pop 0.5s ease-out 0.1s backwards; }
  }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #05060f; color: #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; }
  .card { max-width: 460px; width: 100%; text-align: center; padding: 40px 32px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); background: #0b0d18; box-shadow: 0 0 40px rgba(56,189,248,0.1); }
  .icon { font-size: 42px; line-height: 1; margin-bottom: 16px; }
  .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #38bdf8; margin: 0 0 10px; }
  h1 { font-size: 22px; margin: 0 0 6px; color: ${accent}; font-weight: 700; }
  .subtitle { font-size: 14px; font-weight: 600; color: #e5e7eb; margin: 0 0 12px; }
  p.message { font-size: 14px; line-height: 1.6; color: #9ca3af; margin: 0; }
  .features { list-style: none; margin: 20px 0 0; padding: 16px; text-align: left; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); display: grid; gap: 8px; }
  .features li { font-size: 13px; color: #cbd5e1; display: flex; align-items: flex-start; gap: 8px; }
  .features li span { color: #34d399; flex-shrink: 0; margin-top: 1px; }
  .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 26px; }
  .btn { display: inline-block; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; }
  .btn-primary { background: #38bdf8; color: #05060f; }
  .btn-secondary { background: transparent; color: #cbd5e1; border: 1px solid rgba(255,255,255,0.12); }
  .btn:focus-visible { outline: 2px solid #38bdf8; outline-offset: 3px; }
  .link { display: inline-block; margin-top: 20px; font-size: 13px; color: #6b7280; text-decoration: underline; }
  .link:focus-visible { outline: 2px solid #38bdf8; outline-offset: 3px; }
  @media (min-width: 420px) {
    .actions { flex-direction: row; justify-content: center; }
    .btn { flex: 1; }
  }
</style>
</head>
<body>
  <main class="card" role="main">
    <p class="eyebrow">Pakistan Economic Intelligence</p>
    <div class="icon" aria-hidden="true">${opts.icon}</div>
    <h1>${escapeHtml(opts.title)}</h1>
    ${opts.subtitle ? `<p class="subtitle">${escapeHtml(opts.subtitle)}</p>` : ""}
    <p class="message">${escapeHtml(opts.message)}</p>
    ${featuresHtml}
    <div class="actions">${buttons.join("")}</div>
  </main>
</body>
</html>`;
}
