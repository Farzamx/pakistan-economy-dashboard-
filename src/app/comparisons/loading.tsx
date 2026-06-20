import Sidebar from "@/components/Sidebar";

// Same reasoning as src/app/loading.tsx — without an immediate fallback, a
// sidebar click into /comparisons has zero visual feedback for as long as
// the slowest comparison's data fetch takes, which can look indistinguishable
// from the click doing nothing.
export default function ComparisonsLoading() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-white/5" />
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="glass-card h-72 animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
