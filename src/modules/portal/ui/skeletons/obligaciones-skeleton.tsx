import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

export function ObligacionesSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando obligaciones">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 md:h-9" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="portal-home-card overflow-hidden rounded-xl">
          <div className="px-4 py-3">
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-3 border-t border-border px-4 py-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
      </div>
    </>
  )
}
