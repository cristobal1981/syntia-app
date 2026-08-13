import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

export function ClientHomeSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando inicio">
        <header className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-56 md:h-9 md:w-72" />
        </header>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <Skeleton className="h-7 w-64 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="portal-home-card overflow-hidden rounded-xl">
            <div className="divide-y divide-border">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-1.5 px-5 py-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <Skeleton className="mb-4 h-3 w-28" />
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-28 rounded-md" />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
