import type { Metadata } from "next";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { marketingFontVariables } from "@/lib/marketingFonts";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const TITLE = `Contact | ${SITE_NAME}`;
const DESCRIPTION = "Get in touch with PEIC — questions, data corrections, or feedback.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/contact`, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const LINKEDIN_URL = "https://www.linkedin.com/in/farzam-arif";
const CONTACT_EMAIL = "feedback.peic@gmail.com";

export default function ContactPage() {
  return (
    <div className={`${marketingFontVariables} marketing-theme min-h-screen w-full`}>
      <MarketingNav />

      <main className="mx-auto w-full max-w-[560px] px-5 pb-24 pt-32 min-[1024px]:px-10 min-[1024px]:pt-40">
        <span className="text-[11px] uppercase tracking-[0.14em]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
          Contact
        </span>
        <h1 className="mt-3 text-[32px] font-bold leading-tight min-[1024px]:text-[44px]" style={{ fontFamily: "var(--font-marketing-heading)", color: "var(--paper)" }}>
          Get in touch
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed min-[1024px]:text-[17px]" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}>
          Wrong number on a chart, a data source we should be tracking, a calculator that doesn&apos;t match your
          situation, or just feedback on the platform — reach out directly.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex min-h-[52px] w-full items-center justify-center rounded-lg px-6 text-[16px] font-semibold min-[480px]:w-auto"
            style={{ fontFamily: "var(--font-marketing-body)", background: "var(--indigo)", color: "var(--paper)" }}
          >
            {CONTACT_EMAIL}
          </a>

          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] w-full items-center justify-center rounded-lg border px-6 text-[16px] font-medium min-[480px]:w-auto"
            style={{ fontFamily: "var(--font-marketing-body)", borderColor: "var(--ink-raised)", color: "var(--paper)" }}
          >
            LinkedIn ↗
          </a>

          <p className="mt-2 text-[14px]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
            Pakistan
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
