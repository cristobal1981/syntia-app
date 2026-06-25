import type { PortalUser } from '@/src/modules/auth/domain/types'
import { flattenObligacionesYear } from '@/src/modules/obligaciones/domain/sort-obligaciones-list'
import { getObligacionesForClient } from '@/src/modules/obligaciones/application/get-obligaciones-for-client'
import { mergeTramitesList } from '@/src/modules/tramites/domain/merge-tramites-list'
import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'
import { getTramitesForClient } from '@/src/modules/tramites/application/get-tramites-for-client'

export type ClientDashboardSnapshot = {
  activeTramites: number
  obligacionesInProgress: number
}

export type ClientDashboardSnapshotResult =
  | { ok: true; data: ClientDashboardSnapshot }
  | { ok: false; error: 'not_linked' | 'odoo_unavailable' | 'forbidden' }

export async function getClientDashboardSnapshot(
  user: PortalUser
): Promise<ClientDashboardSnapshotResult> {
  const [tramitesResult, obligacionesResult] = await Promise.all([
    getTramitesForClient(user),
    getObligacionesForClient(user),
  ])

  if (!tramitesResult.ok) {
    if (tramitesResult.error === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return { ok: false, error: tramitesResult.error }
  }

  if (!obligacionesResult.ok) {
    if (obligacionesResult.error === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return { ok: false, error: obligacionesResult.error }
  }

  const items = mergeTramitesList(
    tramitesResult.data.tasks,
    tramitesResult.data.tickets
  )

  const activeTramites = items.filter(
    (item) => item.kind === 'tramite' && !item.isClosed
  ).length

  const obligacionesInProgress = obligacionesResult.data.years
    .flatMap((year) => flattenObligacionesYear(year))
    .filter((row) => !isTaskClosed(row.state)).length

  return {
    ok: true,
    data: {
      activeTramites,
      obligacionesInProgress,
    },
  }
}
