import { portal } from '@/content/portal'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getHomeDataForRole } from '@/src/modules/portal/application/get-home-data-for-role'
import { IntegrationBadges } from '@/src/modules/portal/ui/integration-badges'
import { MockDataTable } from '@/src/modules/portal/ui/mock-data-table'
import { StatCard } from '@/src/modules/portal/ui/stat-card'

type AdvisorHomeProps = {
  user: PortalUser
}

export function AdvisorHome({ user }: AdvisorHomeProps) {
  const data = getHomeDataForRole(user)
  const copy = portal.home.advisor

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

      {data.clients ? (
        <section aria-labelledby="advisor-clients">
          <h2
            id="advisor-clients"
            className="mb-4 font-sans text-lg font-semibold text-foreground"
          >
            {copy.clientsTitle}
          </h2>
          <MockDataTable
            headers={['Cliente', 'Empresa', 'Tareas pendientes']}
            rows={data.clients.map((client) => [
              client.name,
              client.company,
              String(client.pendingTasks),
            ])}
          />
        </section>
      ) : null}

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
                className="rounded-xl border border-agua/30 bg-card/60 px-4 py-3 text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.integrations ? (
        <section aria-labelledby="advisor-integrations">
          <h2 id="advisor-integrations" className="sr-only">
            Integraciones
          </h2>
          <IntegrationBadges integrations={data.integrations} />
        </section>
      ) : null}
    </div>
  )
}
