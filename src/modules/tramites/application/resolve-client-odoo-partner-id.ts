import type { PortalUser } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { getClientIntegrationByUserId } from '@/src/modules/directory/infrastructure/client-integrations.supabase'

export async function resolveClientOdooPartnerId(
  user: PortalUser
): Promise<number | null> {
  const portalUserId = await resolveDirectoryActorId(user)
  const integration = await getClientIntegrationByUserId(portalUserId)

  const partnerId = integration?.odoo_partner_id
  if (typeof partnerId === 'number' && partnerId > 0) {
    return partnerId
  }

  return null
}
