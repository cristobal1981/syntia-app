import { Users } from 'lucide-react'

import { equipo } from '@/content/equipo'
import { portal } from '@/content/portal'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { listClientsAction } from '@/src/modules/directory/application/directory-queries'
import { buildOnboardingSolicitudStats } from '@/src/modules/onboarding/domain/onboarding-solicitud-stats'
import { listOnboardingSolicitudesAction } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { getIntegrationsStatusForRole } from '@/src/modules/portal/application/get-integrations-status'
import { StaffHomeBento } from '@/src/modules/portal/ui/staff-home-bento'

type AdvisorHomeProps = {
  user: PortalUser
}

export async function AdvisorHome({ user }: AdvisorHomeProps) {
  const [integrations, clients, solicitudesResult] = await Promise.all([
    getIntegrationsStatusForRole(user.role),
    listClientsAction(),
    listOnboardingSolicitudesAction(),
  ])
  const copy = portal.home.advisor
  const solicitudStats = buildOnboardingSolicitudStats(
    solicitudesResult.ok ? solicitudesResult.rows : []
  )

  return (
    <StaffHomeBento
      greeting={copy.greeting}
      displayName={user.name}
      requestsTitle={copy.requestsTitle}
      solicitudStats={solicitudStats}
      statTiles={[
        {
          label: copy.clientsStat,
          value: clients.length,
          icon: Users,
          href: '/clientes',
        },
      ]}
      tableTitle={copy.clientsTitle}
      tableHref="/clientes"
      tableViewAllLabel={equipo.clientes.viewAll}
      tableHeaders={['Cliente', 'Empresa', 'Estado']}
      tableRows={clients.slice(0, 5).map((client) => [
        client.name,
        client.companyName ?? '—',
        client.status === 'active' ? equipo.status.active : equipo.status.invited,
      ])}
      tableEmptyMessage={equipo.clientes.emptyDescription}
      integrations={integrations}
      integrationsTitle={copy.integrationsTitle}
    />
  )
}
