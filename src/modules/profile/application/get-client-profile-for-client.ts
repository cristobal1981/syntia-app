import type { PortalUser } from '@/src/modules/auth/domain/types'
import type { ClientProfile } from '@/src/modules/profile/domain/types'
import { fetchClientProfileFromOdoo } from '@/src/modules/profile/infrastructure/odoo-partner-profile-repository'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

export type ClientProfileResult =
  | { ok: true; profile: ClientProfile }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'odoo_unavailable' }

export async function getClientProfileForClient(
  user: PortalUser
): Promise<ClientProfileResult> {
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
    const profile = await fetchClientProfileFromOdoo(partnerId, user.id)
    return { ok: true, profile }
  } catch (error) {
    if (error instanceof Error && error.message === 'ODOO_NOT_CONFIGURED') {
      return { ok: false, error: 'odoo_unavailable' }
    }
    return { ok: false, error: 'odoo_unavailable' }
  }
}
