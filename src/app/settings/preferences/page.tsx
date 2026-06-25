import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import PreferencesBoard from "@/components/preferences/PreferencesBoard";

export const metadata: Metadata = {
  title: "Dashboard Preferences — Pakistan Economic Intelligence Center",
  description: "Pin favorite indicators, hide unwanted widgets, and set your default province and theme.",
  robots: { index: false, follow: false },
};

export default function PreferencesPage() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Dashboard Preferences</h1>
          <p className="max-w-2xl text-sm text-[var(--text-muted)]">
            Customize your homepage — pin the indicators you check most, hide the ones you don&apos;t, and set a
            default province and theme. Changes save automatically and sync to every device you sign in on.
          </p>
        </div>
        <PreferencesBoard />
      </main>
    </div>
  );
}
