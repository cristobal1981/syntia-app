import { isClientOrWorkerRole, type PortalUser } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import {
  filterNotificationsForWorker,
  maskStatsForWorker,
} from '@/src/modules/colaboradores/application/mask-dashboard-for-worker'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import type { ChatterNotificationsCheckResult } from '@/src/modules/portal/domain/chatter-notifications-types'
import { loadClientChatterNotifications } from '@/src/modules/portal/application/load-client-chatter-notifications'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

export async function getClientChatterNotificationsForUser(
  user: PortalUser
): Promise<ChatterNotificationsCheckResult> {
  if (!isClientOrWorkerRole(user.role)) {
    return { ok: false, error: 'forbidden' }
  }

  const partnerId = await resolveClientOdooPartnerId(user)
  if (!partnerId) {
    return { ok: false, error: 'not_linked' }
  }

  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  const actorId = await resolveDirectoryActorId(user)
  const result = await loadClientChatterNotifications({ partnerId, actorId })

  if (user.role === 'worker' && result.ok) {
    const allowedSections = await getAllowedSectionsForWorker(user)
    return {
      ...result,
      stats: maskStatsForWorker(result.stats, allowedSections),
      unread: filterNotificationsForWorker(result.unread, allowedSections),
    }
  }

  return result
}
