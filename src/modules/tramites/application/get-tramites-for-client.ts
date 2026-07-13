import type { PortalUser } from '@/src/modules/auth/domain/types'
import type { TramitesResult } from '@/src/modules/tramites/domain/types'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'
import { getCachedTramitesSnapshot } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { isOdooApiConfigured, resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'

export async function getTramitesForClient(
  user: PortalUser
): Promise<TramitesResult> {
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
    const data = await getCachedTramitesSnapshot(partnerId)
    return { ok: true, data }
  } catch (error) {
    if (error instanceof Error && error.message === 'ODOO_NOT_CONFIGURED') {
      return { ok: false, error: 'odoo_unavailable' }
    }
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
