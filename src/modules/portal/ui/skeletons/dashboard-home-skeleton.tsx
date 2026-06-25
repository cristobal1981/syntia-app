import { Skeleton } from '@/components/ui/skeleton'

export function DashboardHomeSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando inicio">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56 md:h-9 md:w-72" />
      </header>

      <section>
        <Skeleton className="mb-4 h-6 w-28" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="portal-home-card rounded-xl p-4 md:p-5">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="mt-2 h-4 w-28" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="portal-home-card rounded-xl px-5 py-6">
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </section>

      <section className="portal-home-card rounded-xl p-5 md:p-6">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-4 h-9 w-40" />
      </section>

      <section>
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="portal-home-card rounded-xl p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-3 h-4 w-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
