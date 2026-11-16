// Skeleton for /overview, sized like the final layout so nothing shifts when the data arrives.
// Server component: no data, no hooks.

const CARD = "rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface";
const BAR = "animate-pulse rounded bg-pe-surface-2";

export default function OverviewLoading() {
  return (
    <div className="flex min-h-screen w-full">
      <main className="min-w-0 flex-1" aria-busy="true" aria-label="Loading the overview">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 pb-28 pt-6 lg:gap-5 lg:px-6 lg:pt-8">
          <div>
            <div className={`${BAR} h-3 w-44`} />
            <div className={`${BAR} mt-3 h-8 w-80 max-w-full`} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${CARD} h-[420px]`} />
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={`${CARD} h-[150px] lg:h-[202px]`} />
              ))}
            </div>
          </div>
          <div className={`${CARD} h-[372px] lg:h-[108px]`} />
          <div className={`${CARD} h-[330px] lg:h-[132px]`} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className={`${CARD} h-[400px]`} />
            <div className={`${CARD} h-[400px]`} />
          </div>
          <div className={`${CARD} h-[620px]`} />
        </div>
      </main>
    </div>
  );
}
