export function AutomatizacionesSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-2xl space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="portal-home-card h-56 animate-pulse rounded-2xl bg-muted/40"
          />
        ))}
      </div>
    </div>
  )
}
