import { UserCog, Users } from 'lucide-react'

import { equipo } from '@/content/equipo'
import { portal } from '@/content/portal'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import {
  listClientsAction,
  listGestoresAction,
} from '@/src/modules/directory/application/directory-queries'
import { buildOnboardingSolicitudStats } from '@/src/modules/onboarding/domain/onboarding-solicitud-stats'
import { listOnboardingSolicitudesAction } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { getIntegrationsStatusForRole } from '@/src/modules/portal/application/get-integrations-status'
import { StaffHomeBento } from '@/src/modules/portal/ui/staff-home-bento'

type AdminHomeProps = {
  user: PortalUser
}

export async function AdminHome({ user }: AdminHomeProps) {
  const [integrations, gestores, clients, solicitudesResult] = await Promise.all([
    getIntegrationsStatusForRole(user.role),
    listGestoresAction(),
    listClientsAction(),
    listOnboardingSolicitudesAction(),
  ])
  const copy = portal.home.admin
  const solicitudStats = buildOnboardingSolicitudStats(
    solicitudesResult.ok ? solicitudesResult.rows : []
  )

  return (
    <StaffHomeBento
      greeting={copy.greeting}
      displayName={user.companyName ?? user.name}
      requestsTitle={copy.requestsTitle}
      solicitudStats={solicitudStats}
      statTiles={[
        {
          label: copy.clientsStat,
          value: clients.length,
          icon: Users,
          href: '/equipo/clientes',
        },
        {
          label: copy.advisorsStat,
          value: gestores.length,
          icon: UserCog,
          href: '/equipo/gestores',
        },
      ]}
      tableTitle={copy.teamTitle}
      tableHref="/equipo/gestores"
      tableViewAllLabel={copy.viewTeamLink}
      tableHeaders={['Nombre', 'Rol', 'Estado']}
      tableRows={gestores.slice(0, 5).map((member) => [
        member.name,
        equipo.roles[member.role],
        member.status === 'active' ? equipo.status.active : equipo.status.invited,
      ])}
      tableEmptyMessage={equipo.gestores.emptyDescription}
      integrations={integrations}
      integrationsTitle={copy.integrationsTitle}
    />
  )
}
