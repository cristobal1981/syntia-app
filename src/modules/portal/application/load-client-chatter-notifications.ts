export { loadClientPortalNotifications } from '@/src/modules/portal/application/load-client-portal-notifications'

import { loadClientPortalNotifications } from '@/src/modules/portal/application/load-client-portal-notifications'
import type { PortalNotificationsCheckResult } from '@/src/modules/portal/domain/portal-notifications-types'

/** @deprecated Use loadClientPortalNotifications */
export async function loadClientChatterNotifications(input: {
  partnerId: number
  actorId: string
}): Promise<PortalNotificationsCheckResult> {
  return loadClientPortalNotifications(input)
}
