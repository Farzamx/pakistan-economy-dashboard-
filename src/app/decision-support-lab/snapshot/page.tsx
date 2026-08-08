import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import SnapshotDashboard from "@/components/decisionSupportLab/SnapshotDashboard";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/decision-support-lab/snapshot`;
const TITLE = "My Snapshot | PEIC Decision Support Lab";
const DESCRIPTION = "Every result you've saved from across the Decision Support Lab, in one scannable view.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: false, follow: false },
};

export default function SnapshotPage() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 pt-16 text-sm font-medium min-[800px]:pt-0">
            <Link
              href="/decision-support-lab"
              aria-label="Back to Decision Support Lab"
              className="-ml-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-3 text-white/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-blue light:text-slate-700 light:hover:bg-slate-900/5 light:hover:text-slate-900"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                <path d="M13 8H3M3 8L7.5 3.5M3 8L7.5 12.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Decision Support Lab
            </Link>
            <span aria-hidden="true" className="text-white/25 light:text-slate-300">/</span>
            <span aria-current="page" className="text-white light:text-slate-900">My Snapshot</span>
          </nav>

          <div>
            <h1 className="text-display text-white light:text-slate-900">My Snapshot</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/60 light:text-slate-500">
              Every result you&apos;ve saved from across the Lab, in one place — each one links back to the tool it came from.
            </p>
          </div>

          <SnapshotDashboard />
        </div>
      </main>
    </div>
  );
}
