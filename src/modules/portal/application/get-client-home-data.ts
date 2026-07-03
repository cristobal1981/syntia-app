import type { PortalUser } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import type { ChatterNotificationsCheckResult } from '@/src/modules/portal/domain/chatter-notifications-types'
import { loadClientPortalNotifications } from '@/src/modules/portal/application/load-client-portal-notifications'
import type {
  ClientDashboardSnapshot,
  ClientDashboardSnapshotResult,
} from '@/src/modules/portal/application/get-client-dashboard-snapshot'
import {
  getCachedObligacionTaskIndex,
  getCachedPendingSignaturesSnapshotSafe,
  getCachedTramitesSnapshotSafe,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { isOdooApiConfigured, resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'
import { mergeTramitesList } from '@/src/modules/tramites/domain/merge-tramites-list'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

export type ClientHomeData = {
  snapshot: ClientDashboardSnapshot | null
  snapshotError: Extract<ClientDashboardSnapshotResult, { ok: false }>['error'] | null
  notifications: ChatterNotificationsCheckResult | null
}

export async function getClientHomeData(user: PortalUser): Promise<ClientHomeData> {
  if (user.role !== 'client') {
    return {
      snapshot: null,
      snapshotError: 'forbidden',
      notifications: { ok: false, error: 'forbidden' },
    }
  }

  const partnerId = await resolveClientOdooPartnerId(user)
  if (!partnerId) {
    return {
      snapshot: null,
      snapshotError: 'not_linked',
      notifications: { ok: false, error: 'not_linked' },
    }
  }

  if (!isOdooApiConfigured()) {
    return {
      snapshot: null,
      snapshotError: 'odoo_unavailable',
      notifications: { ok: false, error: 'odoo_unavailable' },
    }
  }

  const actorId = await resolveDirectoryActorId(user)

  try {
    const [tramitesResult, obligIndex, firmasResult, notifications] =
      await Promise.all([
        getCachedTramitesSnapshotSafe(partnerId),
        getCachedObligacionTaskIndex(partnerId),
        getCachedPendingSignaturesSnapshotSafe(partnerId),
        loadClientPortalNotifications({
          partnerId,
          actorId,
          cache: false,
          persist: false,
        }),
      ])

    const tramitesSnap = tramitesResult.data
    const items = mergeTramitesList(tramitesSnap.tasks, tramitesSnap.tickets)
    const activeTramitesAndConsultas = items.filter((item) => !item.isClosed).length
    const obligacionesInProgress = obligIndex.leaves.filter(
      (leaf) => !isTaskClosed(leaf.state)
    ).length
    const pendingSignatures = firmasResult.data.requests.length

    const odooErrors = [
      tramitesResult.odooError,
      firmasResult.odooError,
    ].filter((error): error is NonNullable<typeof error> => Boolean(error))

    const allOdooFailed =
      tramitesResult.odooError &&
      firmasResult.odooError &&
      items.length === 0 &&
      obligIndex.leaves.length === 0 &&
      firmasResult.data.requests.length === 0

    let snapshot: ClientDashboardSnapshot | null = {
      activeTramitesAndConsultas,
      obligacionesInProgress,
      pendingSignatures,
    }
    let snapshotError: ClientHomeData['snapshotError'] = null

    if (allOdooFailed) {
      const rateLimited = odooErrors.every((error) => error === 'odoo_rate_limited')
      snapshot = null
      snapshotError = rateLimited ? 'odoo_rate_limited' : 'odoo_unavailable'
    }

    return {
      snapshot,
      snapshotError,
      notifications,
    }
  } catch (error) {
    const code = resolveOdooErrorCode(error)
    return {
      snapshot: null,
      snapshotError: code,
      notifications: { ok: false, error: code },
    }
  }
}
