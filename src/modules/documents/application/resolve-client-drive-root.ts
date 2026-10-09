import type { PortalUser } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { getCachedClientDriveRootId } from '@/src/modules/directory/infrastructure/client-integrations.supabase'

export async function resolveClientDriveRootId(
  user: PortalUser
): Promise<string | null> {
  const portalUserId = await resolveDirectoryActorId(user)
  return getCachedClientDriveRootId(portalUserId)
}
