import {
  Clock,
  FileSignature,
  FileUp,
  Flame,
  MessageCircleWarning,
  RefreshCw,
} from 'lucide-react'

import { firmas } from '@/content/firmas'
import { portal } from '@/content/portal'
import type { PortalNotification } from '@/src/modules/portal/domain/portal-notifications-types'
import { cn } from '@/lib/utils'

type PortalNotificationItemMetaProps = {
  item: PortalNotification
  className?: string
}

export function portalNotificationTypeLabel(
  item: PortalNotification,
  copy: typeof portal.notifications = portal.notifications
): string {
  switch (item.reason) {
    case 'new_tramite':
      return copy.typeNewTramite
    case 'unread_chatter':
      return copy.typeUnreadMessage
    case 'status_change':
      return item.isCloseEvent ? copy.typeStatusClosed : copy.typeStatusChange
    case 'new_document':
      return copy.typeNewDocument
    case 'new_firma':
      return copy.typeNewFirma
    case 'firma_due_soon':
      return firmas.list.dueSoon
    default:
      return copy.label
  }
}

function notificationIcon(item: PortalNotification) {
  switch (item.reason) {
    case 'new_tramite':
      return Flame
    case 'unread_chatter':
      return MessageCircleWarning
    case 'status_change':
      return RefreshCw
    case 'new_document':
      return FileUp
    case 'new_firma':
      return FileSignature
    case 'firma_due_soon':
      return Clock
    default:
      return MessageCircleWarning
  }
}

export function PortalNotificationItemMeta({
  item,
  className,
}: PortalNotificationItemMetaProps) {
  const copy = portal.notifications
  const Icon = notificationIcon(item)
  const label = portalNotificationTypeLabel(item, copy)

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span>{label}</span>
      {item.reason === 'status_change' &&
      item.previousStateLabel &&
      item.newStateLabel ? (
        <span className="text-muted-foreground">
          {item.previousStateLabel} → {item.newStateLabel}
        </span>
      ) : null}
    </span>
  )
}
