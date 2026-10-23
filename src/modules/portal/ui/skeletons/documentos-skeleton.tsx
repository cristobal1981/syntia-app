import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

/** Barra de ruta y acciones, buscador y listado de archivos: la estructura real de Documentos (no lleva título). */
export function DocumentosSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando documentos">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-3" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 dark:border-border/50"
            >
              <Skeleton className="size-5 shrink-0 rounded-md" />
              <Skeleton className="h-4 flex-1 max-w-72" />
              <Skeleton className="hidden h-4 w-20 sm:block" />
              <Skeleton className="size-9 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
