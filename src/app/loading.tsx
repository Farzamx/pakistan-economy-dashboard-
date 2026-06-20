import Sidebar from "@/components/Sidebar";

// Without this, Next.js 16 (which no longer overrides scroll-behavior
// during navigation — see the App Router migration notes) blocks the
// entire route transition on this page's data fetches before showing
// anything, so a sidebar click can sit with zero visual feedback for as
// long as the slowest source takes to respond. Rendering Sidebar here
// immediately makes navigation feel instant — the nav itself, where the
// user just clicked, appears at once while the page's own data streams in.
export default function HomeLoading() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="glass-card h-40 animate-pulse rounded-2xl" />
          ))}
        </div>
      </main>
    </div>
  );
}
