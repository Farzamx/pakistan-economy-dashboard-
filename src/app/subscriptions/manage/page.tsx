import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/seoConfig";

export const metadata: Metadata = {
  title: "Manage Subscription — Pakistan Economic Intelligence",
  description: "Manage your Pakistan Economic Calendar release alert subscription.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

// Reached two ways: deep-linked with a real unsubscribe_token from the
// verify-success page (a genuine management action), or cold via the
// "Already subscribed?" link on the subscription form, where no token is
// available — that case is necessarily informational, since this system
// has no accounts and therefore no way to identify an anonymous visitor's
// subscription. Either way, this only ever calls the existing, unmodified
// unsubscribe route (/api/subscribers/unsubscribe) — no new backend logic.
export default async function ManageSubscriptionPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const unsubscribeUrl = token ? `${SITE_URL}/api/subscribers/unsubscribe?token=${token}` : null;

  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d18] p-6 text-center shadow-[0_0_40px_rgba(56,189,248,0.1)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Pakistan Economic Intelligence</p>
        <h1 className="mt-3 text-xl font-semibold text-white">Manage Your Subscription</h1>

        {unsubscribeUrl ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              You&apos;re currently subscribed to official Pakistan economic release alerts. If you no longer wish to receive them, you can unsubscribe below — this takes effect immediately.
            </p>
            <a
              href={unsubscribeUrl}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/10 px-6 py-3.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 sm:w-auto sm:px-8"
            >
              Unsubscribe from alerts
            </a>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            To manage or cancel your subscription, use the one-click unsubscribe link included in the footer of any alert email you&apos;ve received from Pakistan Economic Intelligence.
          </p>
        )}

        <div className="mt-7 border-t border-white/10 pt-5">
          <Link href="/economic-calendar" className="text-sm font-medium text-sky-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 rounded">
            ← Back to the Economic Calendar
          </Link>
        </div>
      </div>
    </main>
  );
}
