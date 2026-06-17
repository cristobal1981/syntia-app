import Link from 'next/link'

import { equipo } from '@/content/equipo'
import { portal } from '@/content/portal'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { listClientsAction } from '@/src/modules/directory/application/directory-queries'
import { getHomeDataForRole } from '@/src/modules/portal/application/get-home-data-for-role'
import { getIntegrationsStatusForRole } from '@/src/modules/portal/application/get-integrations-status'
import { IntegrationsPanel } from '@/src/modules/portal/ui/integrations-panel'
import { MockDataTable } from '@/src/modules/portal/ui/mock-data-table'
import { StatCard } from '@/src/modules/portal/ui/stat-card'

type AdvisorHomeProps = {
  user: PortalUser
}

export async function AdvisorHome({ user }: AdvisorHomeProps) {
  const data = getHomeDataForRole(user)
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

      <section aria-labelledby="advisor-stats">
        <h2 id="advisor-stats" className="sr-only">
          Resumen
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </section>

      <section aria-labelledby="advisor-clients">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="advisor-clients"
            className="font-sans text-lg font-semibold text-foreground"
          >
            {copy.clientsTitle}
          </h2>
          <Link
            href="/clientes"
            className="text-sm font-medium text-primary hover:underline"
          >
            {equipo.clientes.viewAll}
          </Link>
        </div>
        {previewClients.length ? (
          <MockDataTable
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

      {data.queueItems ? (
        <section aria-labelledby="advisor-queue">
          <h2
            id="advisor-queue"
            className="mb-4 font-sans text-lg font-semibold text-foreground"
          >
            {copy.queueTitle}
          </h2>
          <ul className="flex flex-col gap-3">
            {data.queueItems.map((item) => (
              <li
                key={item}
                className="portal-home-card rounded-xl px-4 py-3 text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="advisor-integrations">
        <IntegrationsPanel
          initialIntegrations={integrations}
          title={copy.integrationsTitle}
          showRefresh
        />
      </section>
    </div>
  )
}