// Tiny shared HTML renderer for the two subscriber-facing confirmation
// pages (verify, unsubscribe) — these are opened directly in a browser
// from an emailed link, not rendered by the app shell, so a minimal
// self-contained HTML response (not a full React page) is the right scope
// here: no Sidebar/layout dependency, just enough styling to not look broken.

export function renderConfirmationPage(opts: { title: string; message: string; success: boolean }): string {
  const accent = opts.success ? "#38bdf8" : "#f87171";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${opts.title} — Pakistan Economic Intelligence</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #05060f; color: #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; }
  .card { max-width: 420px; text-align: center; padding: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #0b0d18; }
  h1 { font-size: 20px; margin: 0 0 12px; color: ${accent}; }
  p { font-size: 14px; line-height: 1.5; color: #9ca3af; margin: 0; }
  a { color: #38bdf8; text-decoration: none; }
</style>
</head>
<body>
  <div class="card">
    <h1>${opts.title}</h1>
    <p>${opts.message}</p>
    <p style="margin-top:16px;"><a href="https://pakeconintel.com/economic-calendar">Back to the Economic Calendar</a></p>
  </div>
</body>
</html>`;
}
