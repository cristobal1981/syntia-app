import type { PortalUser } from '@/src/modules/auth/domain/types'
import type { PendingSignaturesResult } from '@/src/modules/firmas/domain/types'
import { fetchPendingSignaturesFromOdoo } from '@/src/modules/firmas/infrastructure/odoo-sign-repository'
import { isOdooApiConfigured, resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

export async function getPendingSignaturesForClient(
  user: PortalUser
): Promise<PendingSignaturesResult> {
  if (user.role !== 'client') {
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
    const requests = await fetchPendingSignaturesFromOdoo(partnerId)
    return { ok: true, data: { requests } }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
