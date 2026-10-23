import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

/** Cabecera, pestañas (pendientes/historial) y tarjetas de firma: la estructura real de Firmas. */
export function FirmasSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando firmas">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-56 md:h-9 md:w-72" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32 shrink-0" />
        </header>

        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <article key={index} className="portal-home-card rounded-xl p-4">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 sm:grid-cols-[auto_1fr_auto]">
                <Skeleton className="size-10 rounded-lg sm:row-span-2" />
                <div className="min-w-0">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="mt-2 h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="col-span-2 h-10 w-full sm:col-span-1 sm:col-start-3 sm:row-span-2 sm:w-44" />
                <dl className="col-span-2 flex flex-wrap gap-x-6 gap-y-2 sm:col-span-1 sm:col-start-2">
                  {Array.from({ length: 2 }).map((__, metaIndex) => (
                    <div key={metaIndex} className="flex flex-col gap-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </dl>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  )
}
