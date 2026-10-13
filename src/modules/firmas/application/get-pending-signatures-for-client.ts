import { isClientOrWorkerRole, type PortalUser } from '@/src/modules/auth/domain/types'
import type { PendingSignaturesResult } from '@/src/modules/firmas/domain/types'
import { getCachedPendingSignaturesSnapshot } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import {
  isOdooApiConfigured,
  resolveOdooErrorCode,
} from '@/src/modules/portal/infrastructure/odoo-json-client'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

export async function getPendingSignaturesForClient(
  user: PortalUser
): Promise<PendingSignaturesResult> {
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

  try {
    const data = await getCachedPendingSignaturesSnapshot(partnerId)
    return { ok: true, data }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
