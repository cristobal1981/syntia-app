import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'
import { TramitesPageHeader } from '@/src/modules/tramites/ui/tramites-page-header'

const CHIP_WIDTHS = ['w-40', 'w-20', 'w-24', 'w-24', 'w-28', 'w-24'] as const
const ROW_NAME_WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2', 'w-3/5', 'w-2/5', 'w-1/2', 'w-3/5', 'w-2/5'] as const

/** Filtros y lista de trámites: lo que espera a los datos (misma estructura que la pantalla real). */
export function TramitesBodySkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando trámites">
      <div className="portal-home-card flex flex-col gap-2.5 rounded-xl p-3 sm:gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Skeleton className="h-10 min-w-[220px] flex-1" />
          <Skeleton className="h-5 w-40 sm:ml-auto" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-x-4 sm:gap-y-2">
          {CHIP_WIDTHS.map((width, index) => (
            <Skeleton key={index} className={`h-8 rounded-md ${width}`} />
          ))}
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:block dark:border-transparent dark:shadow-none">
        <div className="flex items-center gap-4 border-b border-border px-4 py-3 dark:border-border/50">
          <Skeleton className="h-3.5 w-16 flex-1 max-w-24" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        {ROW_NAME_WIDTHS.map((width, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 dark:border-border/50"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Skeleton className="size-5 shrink-0 rounded-md" />
              <Skeleton className={`h-4 ${width}`} />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-3 sm:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index} className="portal-home-card flex flex-col gap-2 rounded-xl p-3">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Pantalla completa mientras se resuelve la sesión: la cabecera real (no depende de datos) y el cuerpo en esqueleto. */
export function TramitesSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-8">
        <TramitesPageHeader />
        <TramitesBodySkeleton />
      </div>
    </>
  )
}
