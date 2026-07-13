import type { PortalUser } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { getCachedClientOdooPartnerId } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'

export async function resolveClientOdooPartnerId(
  user: PortalUser
): Promise<number | null> {
  const portalUserId = await resolveDirectoryActorId(user)
  return getCachedClientOdooPartnerId(portalUserId)
}
