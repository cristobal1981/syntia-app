import { portal } from '@/content/portal'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getHomeDataForRole } from '@/src/modules/portal/application/get-home-data-for-role'
import { IntegrationBadges } from '@/src/modules/portal/ui/integration-badges'
import { MockDataTable } from '@/src/modules/portal/ui/mock-data-table'
import { StatCard } from '@/src/modules/portal/ui/stat-card'

type AdminHomeProps = {
  user: PortalUser
}

export function AdminHome({ user }: AdminHomeProps) {
  const data = getHomeDataForRole(user)
  const copy = portal.home.admin

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">{copy.greeting}</p>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {user.companyName ?? user.name}
        </h1>
      </header>

      <section aria-labelledby="admin-stats">
        <h2 id="admin-stats" className="sr-only">
          Resumen
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </section>

      {data.team ? (
        <section aria-labelledby="admin-team">
          <h2
            id="admin-team"
            className="mb-4 font-sans text-lg font-semibold text-foreground"
          >
            {copy.teamTitle}
          </h2>
          <MockDataTable
            headers={['Nombre', 'Rol', 'Estado']}
            rows={data.team.map((member) => [
              member.name,
              member.role,
              member.status === 'active' ? 'Activo' : 'Invitado',
            ])}
          />
        </section>
      ) : null}

      {data.integrations ? (
        <section aria-labelledby="admin-integrations">
          <h2
            id="admin-integrations"
            className="mb-4 font-sans text-lg font-semibold text-foreground"
          >
            {copy.integrationsTitle}
          </h2>
          <IntegrationBadges integrations={data.integrations} />
        </section>
      ) : null}
    </div>
  )
}
