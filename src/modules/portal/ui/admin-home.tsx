import { equipo } from '@/content/equipo'
import { portal } from '@/content/portal'
import { AppLink } from '@/components/ui/app-link'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { listGestoresAction } from '@/src/modules/directory/application/directory-queries'
import { getIntegrationsStatusForRole } from '@/src/modules/portal/application/get-integrations-status'
import { DataTable } from '@/src/modules/portal/ui/data-table'
import { IntegrationsPanel } from '@/src/modules/portal/ui/integrations-panel'
import { PortalDashboardReady } from '@/src/modules/portal/ui/portal-dashboard-ready'

type AdminHomeProps = {
  user: PortalUser
}

export async function AdminHome({ user }: AdminHomeProps) {
  const [integrations, gestores] = await Promise.all([
    getIntegrationsStatusForRole(user.role),
    listGestoresAction(),
  ])
  const copy = portal.home.admin
  const previewGestores = gestores.slice(0, 5)

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">{copy.greeting}</p>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {user.companyName ?? user.name}
        </h1>
      </header>

      <section aria-labelledby="admin-team">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="admin-team"
            className="font-sans text-lg font-semibold text-foreground"
          >
            {copy.teamTitle}
          </h2>
          <AppLink href="/equipo/gestores" className="text-sm">
            {copy.viewTeamLink}
          </AppLink>
        </div>
        {previewGestores.length ? (
          <DataTable
            headers={['Nombre', 'Rol', 'Estado']}
            rows={previewGestores.map((member) => [
              member.name,
              equipo.roles[member.role],
              member.status === 'active'
                ? equipo.status.active
                : equipo.status.invited,
            ])}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{equipo.gestores.emptyDescription}</p>
        )}
      </section>

      <section aria-labelledby="admin-integrations">
        <IntegrationsPanel
          initialIntegrations={integrations}
          title={copy.integrationsTitle}
          showRefresh
        />
      </section>
      <PortalDashboardReady />
    </div>
  )
}
