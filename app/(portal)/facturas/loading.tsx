import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

export default function FacturasLoading() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando facturas">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 md:h-9" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="portal-home-card overflow-hidden rounded-xl">
          <div className="space-y-3 px-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </>
  )
}
