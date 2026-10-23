import { Skeleton } from '@/components/ui/skeleton'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import {
  ClientHomeGreeting,
  ClientHomeQuickLinksSection,
  QUICK_LINKS,
} from '@/src/modules/portal/ui/client-home-static'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

/** Resumen y novedades: lo que depende de Odoo y entra por streaming en el inicio. */
export function ClientHomeDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando novedades">
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <Skeleton className="h-7 w-64 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <div className="portal-home-card overflow-hidden rounded-xl">
          <div className="divide-y divide-border">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-1.5 px-5 py-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export function ClientHomeQuickLinksSkeleton() {
  return (
    <section>
      <Skeleton className="mb-4 h-3 w-28" />
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 rounded-md" />
        ))}
      </div>
    </section>
  )
}

/**
 * Pantalla de carga del inicio de un cliente: el saludo y los accesos rápidos
 * reales (el nombre ya viene en la cookie de sesión firmada, sin consultar nada)
 * y solo el resumen y las novedades en esqueleto. Es lo mismo que pinta la página,
 * así que al llegar los datos no hay saltos. Un colaborador no sabe aún qué
 * accesos tiene y ve su esqueleto.
 */
export function ClientHomeLoading({ user }: { user: PortalUser }) {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-8">
        <ClientHomeGreeting name={user.name} companyName={user.companyName} />
        <ClientHomeDashboardSkeleton />
        {user.role === 'worker' ? (
          <ClientHomeQuickLinksSkeleton />
        ) : (
          <ClientHomeQuickLinksSection links={QUICK_LINKS} />
        )}
      </div>
    </>
  )
}
