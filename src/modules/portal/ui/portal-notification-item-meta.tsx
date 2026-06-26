import { Flame, MessageCircleWarning } from 'lucide-react'

import { portal } from '@/content/portal'
import type { ChatterUnreadNotification } from '@/src/modules/portal/domain/chatter-notifications-types'
import { cn } from '@/lib/utils'

type PortalNotificationItemMetaProps = {
  item: ChatterUnreadNotification
  className?: string
}

export function portalNotificationTypeLabel(
  item: ChatterUnreadNotification,
  copy: typeof portal.notifications = portal.notifications
): string {
  if (item.reason === 'new_tramite') return copy.typeNewTramite
  return copy.typeUnreadMessage
}

export function PortalNotificationItemMeta({
  item,
  className,
}: PortalNotificationItemMetaProps) {
  const copy = portal.notifications
  const isNewTramite = item.reason === 'new_tramite'
  const Icon = isNewTramite ? Flame : MessageCircleWarning
  const label = portalNotificationTypeLabel(item, copy)

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span>{label}</span>
    </span>
  )
}
