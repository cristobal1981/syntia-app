import type { PortalUser } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { getCachedClientOdooPartnerId } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'

/**
 * `knownActorId`: quien llama ya resolvió el actor (`resolveDirectoryActorId`); se reutiliza para no
 * repetir esa consulta a Supabase.
 */
export async function resolveClientOdooPartnerId(
  user: PortalUser,
  knownActorId?: string
): Promise<number | null> {
  const portalUserId = knownActorId ?? (await resolveDirectoryActorId(user))
  return getCachedClientOdooPartnerId(portalUserId)
}
