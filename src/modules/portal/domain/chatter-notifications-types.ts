export type {
  TramiteListKindParam,
  PortalRecordScope,
  PortalNotificationReason,
  PortalNotification,
  ChatterReadStateMap,
  PortalNotificationsCheckResult,
  PortalMarkSeenResult,
  PortalAckNotificationResult,
} from '@/src/modules/portal/domain/portal-notifications-types'

export {
  portalWatchStateKey,
  chatterReadStateKey,
  listKindFromRecordKind,
  recordKindFromListKind,
  scopeFromTramiteListKind,
  openParamFromListKind,
  parseTramiteOpenParam,
  parseObligacionOpenParam,
} from '@/src/modules/portal/domain/portal-notifications-types'

import type {
  PortalNotification,
  PortalNotificationsCheckResult,
  PortalMarkSeenResult,
} from '@/src/modules/portal/domain/portal-notifications-types'

/** @deprecated Use PortalNotification */
export type ChatterUnreadNotification = PortalNotification

/** @deprecated Use PortalNotificationsCheckResult */
export type ChatterNotificationsCheckResult = PortalNotificationsCheckResult

/** @deprecated Use PortalMarkSeenResult */
export type ChatterMarkSeenResult = PortalMarkSeenResult
