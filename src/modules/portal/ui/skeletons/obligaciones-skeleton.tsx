import { Skeleton } from '@/components/ui/skeleton'
import { ObligacionesPageHeader } from '@/src/modules/obligaciones/ui/obligaciones-page-header'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

function SectionTitleSkeleton({ titleWidth, descriptionWidth }: { titleWidth: string; descriptionWidth: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className={`h-6 ${titleWidth}`} />
      <Skeleton className={`h-4 max-w-full ${descriptionWidth}`} />
    </div>
  )
}

/** Guía, buscador y secciones (urgentes, en curso, cerradas): la estructura real de Obligaciones. */
export function ObligacionesBodySkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando obligaciones">
      <div className="flex justify-end">
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="portal-home-card flex flex-col gap-2.5 rounded-xl p-3 sm:gap-3">
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1.5">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <div aria-hidden />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <li
                key={index}
                className="portal-home-card flex items-center gap-3 rounded-xl p-4 sm:gap-4"
              >
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </div>
                </div>
                <Skeleton className="size-4 shrink-0" />
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitleSkeleton titleWidth="w-36" descriptionWidth="w-80" />
          <div className="portal-home-card overflow-hidden rounded-xl p-4">
            <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto size-4" />
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitleSkeleton titleWidth="w-28" descriptionWidth="w-64" />
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <li key={index} className="portal-home-card flex items-center justify-between rounded-xl px-4 py-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="size-4" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/** Pantalla completa mientras se resuelve la sesión: la cabecera real y el cuerpo en esqueleto. */
export function ObligacionesSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-8">
        <ObligacionesPageHeader />
        <ObligacionesBodySkeleton />
      </div>
    </>
  )
}
