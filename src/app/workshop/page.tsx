import type { Metadata } from "next";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { CATEGORY_META, getLessonsByCategory } from "@/lib/workshop/registry";
import { SITE_URL, SITE_NAME } from "@/lib/seoConfig";

const PAGE_URL = `${SITE_URL}/workshop`;
const TITLE = "Economic Workshop — Learn Pakistan Economics";
const DESCRIPTION =
  "Free and premium lessons on Pakistan economics — inflation, GDP, monetary policy, and more. Available in English, Urdu, and Roman Urdu.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const COLOR_CLASSES: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  blue: {
    border: "border-neon-blue/25 hover:border-neon-blue/45",
    bg: "bg-neon-blue/5 hover:bg-neon-blue/10",
    text: "text-neon-blue",
    icon: "bg-neon-blue/10",
  },
  purple: {
    border: "border-neon-purple/25 hover:border-neon-purple/45",
    bg: "bg-neon-purple/5 hover:bg-neon-purple/10",
    text: "text-neon-purple",
    icon: "bg-neon-purple/10",
  },
  emerald: {
    border: "border-emerald-400/25 hover:border-emerald-400/45",
    bg: "bg-emerald-400/5 hover:bg-emerald-400/10",
    text: "text-emerald-400",
    icon: "bg-emerald-400/10",
  },
  amber: {
    border: "border-amber-400/25 hover:border-amber-400/45",
    bg: "bg-amber-400/5 hover:bg-amber-400/10",
    text: "text-amber-400",
    icon: "bg-amber-400/10",
  },
  rose: {
    border: "border-rose-400/25 hover:border-rose-400/45",
    bg: "bg-rose-400/5 hover:bg-rose-400/10",
    text: "text-rose-400",
    icon: "bg-rose-400/10",
  },
};

export default function WorkshopPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
          {/* Header */}
          <div className="mb-10">
            <div className="mb-3 flex items-center gap-2 text-xs text-white/40 light:text-slate-400">
              <Link href="/" className="hover:text-white light:hover:text-slate-700 transition-colors">Home</Link>
              <span>/</span>
              <span>Economic Workshop</span>
            </div>
            <h1 className="text-3xl font-bold text-white light:text-slate-900 sm:text-4xl">
              Economic Workshop
            </h1>
            <p className="mt-3 text-base text-white/60 light:text-slate-500 max-w-2xl">
              Learn Pakistan economics from the ground up — beginner to advanced, available in English, اردو, and Roman Urdu.
            </p>
          </div>

          {/* Category grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORY_META.map((cat) => {
              const lessons = getLessonsByCategory(cat.slug);
              const c = COLOR_CLASSES[cat.color];
              return (
                <Link
                  key={cat.slug}
                  href={`/workshop/${cat.slug}`}
                  className={`group flex flex-col gap-3 rounded-2xl border p-5 transition-all duration-200 ${c.border} ${c.bg}`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${c.icon}`}>
                    {cat.icon}
                  </div>
                  <div>
                    <h2 className={`text-base font-semibold ${c.text}`}>{cat.title.en}</h2>
                    <p className="mt-1 text-sm text-white/50 light:text-slate-500 line-clamp-2">
                      {cat.description.en}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xs text-white/40 light:text-slate-400">
                      {lessons.length > 0 ? `${lessons.length} lesson${lessons.length !== 1 ? "s" : ""}` : "Coming soon"}
                    </span>
                    <svg
                      className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${c.text}`}
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Language note */}
          <div className="mt-10 rounded-xl border border-amber-400/20 bg-amber-400/5 px-5 py-4">
            <p className="text-sm text-white/70 light:text-slate-600">
              <span className="font-semibold text-amber-400">Multilingual:</span>{" "}
              All lessons are available in English, اردو (Urdu), and Roman Urdu. Switch languages in{" "}
              <span className="text-amber-400">Settings → Language</span>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
