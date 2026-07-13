import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

export function DashboardHomeSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando inicio">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56 md:h-9 md:w-72" />
      </header>

      <section>
        <Skeleton className="mb-4 h-6 w-28" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="portal-home-card flex items-start gap-4 rounded-xl p-4 md:p-5">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="mt-2 h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <div className="portal-home-card rounded-xl px-5 py-6">
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </section>

      <section className="portal-home-card rounded-xl p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          </div>
          <Skeleton className="h-9 w-40 shrink-0" />
        </div>
      </section>

      <section>
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="portal-home-card rounded-xl p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-3 h-4 w-full" />
            </div>
          ))}
        </div>
      </section>
      </div>
    </>
  )
}
