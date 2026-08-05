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
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-white/40 light:text-slate-400">
            <Link href="/decision-support-lab" className="hover:text-neon-blue">
              ← Decision Support Lab
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/70 light:text-slate-600">My Snapshot</span>
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
