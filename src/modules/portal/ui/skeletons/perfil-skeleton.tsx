import { Skeleton } from '@/components/ui/skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

function FieldSkeleton({ labelWidth, valueWidth }: { labelWidth: string; valueWidth: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className={`h-3 ${labelWidth}`} />
      <Skeleton className={`h-4 ${valueWidth}`} />
    </div>
  )
}

/** Cabecera con acciones, tarjeta de perfil (avatar, datos, dirección) y secciones de notificaciones y colaboradores. */
export function PerfilSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando perfil">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-2xl flex-col gap-2">
            <Skeleton className="h-8 w-48 md:h-9 md:w-56" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
        </header>

        <article className="w-full overflow-hidden rounded-xl border border-border bg-card dark:border-transparent">
          <div className="flex items-center gap-4 border-b border-border px-5 py-4 md:px-6 md:py-5 dark:border-border/50">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-col gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 md:px-6 md:py-5 dark:border-border/50">
            <Skeleton className="h-4 w-32" />
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldSkeleton labelWidth="w-20" valueWidth="w-40" />
              <FieldSkeleton labelWidth="w-24" valueWidth="w-36" />
              <FieldSkeleton labelWidth="w-16" valueWidth="w-32" />
              <FieldSkeleton labelWidth="w-20" valueWidth="w-28" />
            </div>
          </div>
          <div className="px-5 py-4 md:px-6 md:py-5">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FieldSkeleton labelWidth="w-16" valueWidth="w-24" />
              <FieldSkeleton labelWidth="w-14" valueWidth="w-20" />
              <FieldSkeleton labelWidth="w-20" valueWidth="w-28" />
              <FieldSkeleton labelWidth="w-16" valueWidth="w-24" />
            </div>
          </div>
        </article>

        <section className="portal-home-card flex flex-col gap-4 rounded-xl p-5">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
