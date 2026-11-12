import Sidebar from "@/components/Sidebar";

export default function BudgetLoading() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-10">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-white/5" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="glass-card h-40 animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="glass-card flex h-[520px] flex-col gap-3 rounded-2xl p-5" role="status" aria-busy="true" aria-label="Loading the budget flow diagram">
            <div className="h-5 w-72 animate-pulse rounded bg-white/5" />
            <div className="grid flex-1 grid-cols-4 gap-6">
              {[7, 4, 1, 9].map((rows, col) => (
                <div key={col} className="flex flex-col justify-center gap-3">
                  {Array.from({ length: rows }, (_, r) => (
                    <div key={r} className="animate-pulse rounded bg-white/5" style={{ height: `${Math.max(8, 70 / rows)}px` }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card h-80 animate-pulse rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
