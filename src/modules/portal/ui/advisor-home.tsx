import { equipo } from '@/content/equipo'
import { portal } from '@/content/portal'
import { AppLink } from '@/components/ui/app-link'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { listClientsAction } from '@/src/modules/directory/application/directory-queries'
import { getIntegrationsStatusForRole } from '@/src/modules/portal/application/get-integrations-status'
import { DataTable } from '@/src/modules/portal/ui/data-table'
import { IntegrationsPanel } from '@/src/modules/portal/ui/integrations-panel'
import { PortalDashboardReady } from '@/src/modules/portal/ui/portal-dashboard-ready'

type AdvisorHomeProps = {
  user: PortalUser
}

export async function AdvisorHome({ user }: AdvisorHomeProps) {
  const [integrations, clients] = await Promise.all([
    getIntegrationsStatusForRole(user.role),
    listClientsAction(),
  ])
  const copy = portal.home.advisor
  const previewClients = clients.slice(0, 5)

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">{copy.greeting}</p>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {user.name}
        </h1>
      </header>

      <section aria-labelledby="advisor-clients">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="advisor-clients"
            className="font-sans text-lg font-semibold text-foreground"
          >
            {copy.clientsTitle}
          </h2>
          <AppLink href="/clientes" className="text-sm">
            {equipo.clientes.viewAll}
          </AppLink>
        </div>
        {previewClients.length ? (
          <DataTable
            headers={['Cliente', 'Empresa', 'Estado']}
            rows={previewClients.map((client) => [
              client.name,
              client.companyName ?? '—',
              client.status === 'active'
                ? equipo.status.active
                : equipo.status.invited,
            ])}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {equipo.clientes.emptyDescription}
          </p>
        )}
      </section>

      <section aria-labelledby="advisor-integrations">
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
