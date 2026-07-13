import { unstable_cache } from 'next/cache'

import { getClientIntegrationByUserId } from '@/src/modules/directory/infrastructure/client-integrations.supabase'

const CLIENT_DRIVE_ROOT_REVALIDATE_SECONDS = 300

async function loadClientDriveRootId(actorId: string): Promise<string | null> {
  const integration = await getClientIntegrationByUserId(actorId)
  const driveFolderId = integration?.drive_folder_id?.trim()
  return driveFolderId || null
}

export function clientDriveRootCacheTag(actorId: string): string {
  return `client-drive-root:${actorId}`
}

export async function getCachedClientDriveRootId(
  actorId: string
): Promise<string | null> {
  const cached = unstable_cache(
    () => loadClientDriveRootId(actorId),
    ['client-drive-root', actorId],
    {
      revalidate: CLIENT_DRIVE_ROOT_REVALIDATE_SECONDS,
      tags: [clientDriveRootCacheTag(actorId)],
    }
  )

  return cached()
}
