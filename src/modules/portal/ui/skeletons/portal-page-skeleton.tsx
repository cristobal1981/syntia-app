import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

export function PortalPageSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 md:h-9" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      </div>
    </>
  )
}
