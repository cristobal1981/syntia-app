import { Skeleton } from '@/components/ui/skeleton'
import { ProfilePageHeader } from '@/src/modules/profile/ui/profile-page-header'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

function FieldSkeleton({ labelWidth, valueWidth }: { labelWidth: string; valueWidth: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className={`h-3 ${labelWidth}`} />
      <Skeleton className={`h-4 ${valueWidth}`} />
    </div>
  )
}

/** Identidad y los dos paneles (datos y ajustes): lo que espera a los datos del perfil. */
export function PerfilBodySkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando perfil">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 md:p-6 dark:border-transparent">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="h-8 w-44 rounded-md" />
          </div>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <FieldSkeleton labelWidth="w-16" valueWidth="w-32" />
            <FieldSkeleton labelWidth="w-20" valueWidth="w-28" />
            <FieldSkeleton labelWidth="w-12" valueWidth="w-44" />
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 md:p-6 dark:border-transparent">
          <Skeleton className="mb-5 h-5 w-20" />
          <div className="divide-y divide-border dark:divide-border/50">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex items-start justify-between gap-4 py-5 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-64 max-w-full" />
                </div>
                <Skeleton className="h-6 w-10 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

/** Pantalla completa mientras se resuelve la sesión: la cabecera real (con su acción sin activar) y el cuerpo en esqueleto. */
export function PerfilSkeleton() {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-6">
        <ProfilePageHeader />
        <PerfilBodySkeleton />
      </div>
    </>
  )
}
