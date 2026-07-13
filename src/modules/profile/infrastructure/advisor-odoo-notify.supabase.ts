import type { ClientIntegrationRow } from '@/src/modules/directory/domain/map-directory-row'
import { getClientIntegrationByUserId } from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import { resolveOdooPartnerIdFromUserIdCached } from '@/src/modules/portal/infrastructure/odoo-advisor-partner'

export function readAdvisorOdooUserIdFromIntegration(
  integration: ClientIntegrationRow | null
): number | null {
  const userId = integration?.odoo_user_id
  if (typeof userId !== 'number' || userId <= 0) return null
  return userId
}

export async function getClientAdvisorOdooUserId(
  clientUserId: string
): Promise<number | null> {
  const integration = await getClientIntegrationByUserId(clientUserId)
  return readAdvisorOdooUserIdFromIntegration(integration)
}

/**
 * `odoo_partner_id` = res.partner del cliente (author del mensaje).
 * `odoo_user_id` = res.users del asesor (asignación + resolver partner para notificar).
 */
export async function resolveAdvisorOdooNotifyPartnerIdsFromUserId(
  advisorOdooUserId: number
): Promise<number[]> {
  try {
    const partnerId = await resolveOdooPartnerIdFromUserIdCached(advisorOdooUserId)
    return partnerId ? [partnerId] : []
  } catch (error) {
    console.warn(
      `[chatter] resolve advisor partner from user ${advisorOdooUserId} failed:`,
      error
    )
    return []
  }
}

export async function fetchAdvisorOdooNotifyPartnerIdsForClient(
  clientUserId: string
): Promise<number[]> {
  const advisorUserId = await getClientAdvisorOdooUserId(clientUserId)
  if (!advisorUserId) return []
  return resolveAdvisorOdooNotifyPartnerIdsFromUserId(advisorUserId)
}
