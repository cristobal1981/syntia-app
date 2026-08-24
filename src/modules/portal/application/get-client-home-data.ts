import { isClientOrWorkerRole, type PortalUser } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import {
  filterNotificationsForWorker,
  maskStatsForWorker,
} from '@/src/modules/colaboradores/application/mask-dashboard-for-worker'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import type { ChatterNotificationsCheckResult } from '@/src/modules/portal/domain/chatter-notifications-types'
import { loadClientPortalNotifications } from '@/src/modules/portal/application/load-client-portal-notifications'
import type {
  ClientDashboardSnapshot,
  ClientDashboardSnapshotResult,
} from '@/src/modules/portal/application/get-client-dashboard-snapshot'
import { isOdooApiConfigured, resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

export type ClientHomeData = {
  snapshot: ClientDashboardSnapshot | null
  snapshotError: Extract<ClientDashboardSnapshotResult, { ok: false }>['error'] | null
  notifications: ChatterNotificationsCheckResult | null
}

export async function getClientHomeData(user: PortalUser): Promise<ClientHomeData> {
  if (!isClientOrWorkerRole(user.role)) {
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
    // Un único fetch (fresco, sin unstable_cache) alimenta tanto las
    // novedades como el resumen del home: evita pedirle a Odoo dos veces
    // los mismos trámites/obligaciones/firmas en cada render del home.
    const notifications = await loadClientPortalNotifications({
      partnerId,
      actorId,
      cache: false,
      persist: false,
    })

    if (user.role === 'worker' && notifications.ok) {
      const allowedSections = await getAllowedSectionsForWorker(user)
      const maskedNotifications = {
        ...notifications,
        stats: maskStatsForWorker(notifications.stats, allowedSections),
        unread: filterNotificationsForWorker(notifications.unread, allowedSections),
      }
      return {
        snapshot: maskedNotifications.stats,
        snapshotError: null,
        notifications: maskedNotifications,
      }
    }

    const snapshot: ClientDashboardSnapshot | null = notifications.ok
      ? notifications.stats
      : null
    const snapshotError: ClientHomeData['snapshotError'] = notifications.ok
      ? null
      : notifications.error

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
