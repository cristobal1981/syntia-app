import { invalidatePortalCachesForEvent } from '@/src/modules/portal/infrastructure/portal-cache-invalidation'
import type { PortalEventInput } from '@/src/modules/push/domain/portal-event'
import { insertPortalEvent } from '@/src/modules/push/infrastructure/portal-events.supabase'

/**
 * Guarda el evento y, si es nuevo, deja viejas las cachés del cliente que
 * cambian con él. Lo usan el webhook y los barridos, que crean eventos igual.
 */
export async function insertPortalEventAndInvalidate(
  event: PortalEventInput
): Promise<'created' | 'duplicate'> {
  const status = await insertPortalEvent(event)
  if (status === 'created') invalidatePortalCachesForEvent(event)
  return status
}
