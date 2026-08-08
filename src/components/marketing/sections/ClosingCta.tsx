import Link from "next/link";
import SectionReveal from "@/components/marketing/SectionReveal";

export default function ClosingCta() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 py-20 text-center min-[1024px]:px-10 min-[1024px]:py-28">
      <SectionReveal className="flex flex-col items-center gap-6">
        <Link
          href="/overview"
          className="flex min-h-[44px] w-full max-w-[320px] items-center justify-center rounded-lg px-8 py-4 text-[16px] font-semibold min-[480px]:w-auto"
          style={{ fontFamily: "var(--font-marketing-body)", background: "var(--indigo)", color: "var(--paper)" }}
        >
          Open the platform
        </Link>
      </SectionReveal>
    </section>
  );
}
