import ViewportFadeIn from "@/components/ViewportFadeIn";
import SubscriptionForm from "./SubscriptionForm";
import LiveEmailPreview from "./LiveEmailPreview";

// Premium subscription experience — deliberately "dark mode only" (fixed
// colors, no light: variants) regardless of the dashboard's own theme
// toggle, the same way a Bloomberg/trading terminal aesthetic doesn't
// shift with a website's light/dark preference. This is a presentation
// surface only: the entire subscribe/verify/unsubscribe lifecycle is the
// existing backend (subscribe_email/verify_subscriber/
// unsubscribe_subscriber via subscribers.ts) — the one new piece is the
// rate-limited HTTP entry point those RPCs never had
// (POST /api/subscribers/subscribe, see that route and
// 0015_subscribe_rate_limiting.sql).
//
// Only events genuinely tracked by this calendar after the Rolling
// Calendar refactor are listed below — no PSX-sourced item is included
// (KSE-100/PSX Holiday Calendar were both removed from the calendar
// entirely), and "Other official government sources" replaces a more
// specific claim this dashboard can't currently back for every series.
const TRACKED_EVENTS = [
  "CPI Inflation",
  "Core Inflation",
  "SPI Weekly Inflation",
  "Monetary Policy Decisions",
  "Monetary Policy Reports",
  "Foreign Exchange Reserves",
  "Current Account",
  "Worker Remittances",
  "Trade Balance",
  "Treasury Bill Auctions",
  "Pakistan Investment Bond Auctions",
  "Large Scale Manufacturing",
  "GDP Growth (when officially announced)",
];

const TRUST_POINTS = ["Official government data only", "Verified economic releases", "Fast delivery after publication", "No spam", "One-click unsubscribe", "Free subscription"];

const OFFICIAL_SOURCES = ["State Bank of Pakistan", "Pakistan Bureau of Statistics", "Ministry of Finance", "Other official government sources"];

export default function SubscriptionSection() {
  return (
    <section aria-labelledby="subscribe-heading" className="rounded-3xl border border-white/10 bg-[#05060f] p-6 sm:p-10">
      <ViewportFadeIn>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">Economic Release Notifications</p>
          <h2 id="subscribe-heading" className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-[34px]">
            Never Miss a Market-Moving Economic Release
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">Receive official Pakistan economic releases in your inbox within minutes of publication.</p>
          <p className="mt-3 text-sm text-slate-500">
            Official data from institutions including{" "}
            {OFFICIAL_SOURCES.map((source, i) => (
              <span key={source}>
                <span className="text-slate-300">{source}</span>
                {i < OFFICIAL_SOURCES.length - 2 ? ", " : i === OFFICIAL_SOURCES.length - 2 ? ", and " : ""}
              </span>
            ))}
            .
          </p>
        </div>
      </ViewportFadeIn>

      <div className="mt-9 grid gap-5 lg:grid-cols-[1.05fr_1fr]">
        <ViewportFadeIn delay={0.05}>
          <div className="flex h-full flex-col gap-6 rounded-2xl border border-white/10 bg-[#0b0d18] p-6 sm:p-8" style={{ boxShadow: "0 0 32px rgba(56,189,248,0.08)" }}>
            <div>
              <h3 className="text-lg font-semibold text-white">Subscribe</h3>
              <p className="mt-1 text-sm text-slate-400">One email address. No account, no password, no preferences to configure.</p>
            </div>

            <SubscriptionForm />

            <ul className="flex flex-col gap-2 border-t border-white/10 pt-5 sm:grid sm:grid-cols-2 sm:gap-x-4 sm:gap-y-2">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="mt-0.5 text-emerald-400" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <p className="text-xs leading-relaxed text-slate-500">Designed for investors, analysts, economists, businesses, researchers, and anyone who follows Pakistan&apos;s economy.</p>
          </div>
        </ViewportFadeIn>

        <div className="flex flex-col gap-5">
          <ViewportFadeIn delay={0.1}>
            <div className="rounded-2xl border border-white/10 bg-[#0b0d18] p-6 sm:p-7">
              <h3 className="text-base font-semibold text-white">You&apos;ll receive alerts for</h3>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TRACKED_EVENTS.map((event) => (
                  <li key={event} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-sky-400" aria-hidden="true">
                      &#10003;
                    </span>
                    <span>{event}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ViewportFadeIn>

          <ViewportFadeIn delay={0.15}>
            <LiveEmailPreview />
          </ViewportFadeIn>
        </div>
      </div>
    </section>
  );
}
