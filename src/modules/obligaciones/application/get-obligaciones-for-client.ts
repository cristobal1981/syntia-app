import { isClientOrWorkerRole, type PortalUser } from '@/src/modules/auth/domain/types'
import type { ObligacionesResult } from '@/src/modules/obligaciones/domain/types'
import { fetchObligacionesFromOdoo } from '@/src/modules/obligaciones/infrastructure/odoo-obligaciones-repository'
import { isOdooApiConfigured, resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

export async function getObligacionesForClient(
  user: PortalUser
): Promise<ObligacionesResult> {
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
    const data = await fetchObligacionesFromOdoo(partnerId)
    return { ok: true, data }
  } catch (error) {
    if (error instanceof Error && error.message === 'ODOO_NOT_CONFIGURED') {
      return { ok: false, error: 'odoo_unavailable' }
    }
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
