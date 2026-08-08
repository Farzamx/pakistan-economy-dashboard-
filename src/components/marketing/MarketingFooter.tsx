import Link from "next/link";

const NAV_LINKS = [
  { label: "Platform", href: "/overview" },
  // ?section= is read by proxy.ts to exempt this link from the returning-
  // visitor redirect on "/" — see its comment for why the "#data-sources"
  // fragment alone can't do that job (fragments never reach the server).
  { label: "Data", href: "/?section=data-sources#data-sources" },
  { label: "Methodology", href: "/methodology" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const CONTACT_EMAIL = "feedback.peic@gmail.com";
const LINKEDIN_URL = "https://www.linkedin.com/in/farzam-arif";

export default function MarketingFooter() {
  return (
    <footer className="mkt-content-scrim border-t" style={{ borderColor: "var(--ink-raised)" }}>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-5 py-12 min-[1024px]:flex-row min-[1024px]:items-start min-[1024px]:justify-between min-[1024px]:px-10">
        <div className="flex flex-col gap-2">
          <span className="text-[16px] font-extrabold tracking-tight" style={{ fontFamily: "var(--font-marketing-display)", color: "var(--paper)" }}>
            PEIC
          </span>
          <p className="max-w-[36ch] text-[13px] leading-relaxed" style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}>
            Pakistan Economic Intelligence Center.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="min-h-[44px] py-2 text-[14px] min-[480px]:min-h-0 min-[480px]:py-0"
              style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="min-h-[44px] py-2 text-[14px] min-[480px]:min-h-0 min-[480px]:py-0"
            style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] py-2 text-[14px] min-[480px]:min-h-0 min-[480px]:py-0"
            style={{ fontFamily: "var(--font-marketing-body)", color: "var(--muted)" }}
          >
            LinkedIn
          </a>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1200px] border-t px-5 py-6 min-[1024px]:px-10" style={{ borderColor: "var(--ink-raised)" }}>
        <p className="text-[12px]" style={{ fontFamily: "var(--font-marketing-data)", color: "var(--muted)" }}>
          © {new Date().getFullYear()} Pakistan Economic Intelligence Center.
        </p>
      </div>
    </footer>
  );
}
