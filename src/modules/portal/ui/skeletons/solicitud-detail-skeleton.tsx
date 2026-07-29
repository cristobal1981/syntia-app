import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

export function SolicitudDetailSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div
        className="flex flex-col gap-6"
        aria-busy="true"
        aria-label="Cargando solicitud"
      >
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-64 md:h-9" />
        </div>

        <div className="portal-home-card rounded-xl p-6">
          <Skeleton className="h-5 w-40" />
          <div className="mt-7 flex items-start">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-1 flex-col items-center gap-2.5 last:flex-none"
              >
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <Skeleton className="h-3.5 w-14" />
              </div>
            ))}
          </div>
        </div>

        <div className="portal-home-card rounded-xl p-5">
          <Skeleton className="h-5 w-36" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2 border-t border-border pt-5 dark:border-border/50">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    </>
  )
}
