export function ProductsLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-32 md:px-10" aria-busy="true" aria-label="Loading products">
      <div className="mb-20 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-6">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-16 w-64 animate-pulse rounded bg-muted md:h-24 md:w-80" />
        </div>
        <div className="h-12 w-full max-w-sm animate-pulse rounded bg-muted" />
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[4/5] bg-muted" />
            <div className="mt-4 h-6 w-32 bg-muted" />
            <div className="mt-2 h-3 w-48 bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
