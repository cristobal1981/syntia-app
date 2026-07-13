'use client'

import { FileUp, Flame, MessageCircleWarning, RefreshCw } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { portal } from '@/content/portal'
import { tramites } from '@/content/tramites'
import { usePortalNotificationsOptional } from '@/src/modules/portal/ui/portal-notifications-context'
import {
  getTramiteListRecordKind,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import { isTramiteListItemNew } from '@/src/modules/tramites/domain/tramites-list-seen-state'

type TramiteListNotificationIconsProps = {
  item: TramiteListItem
  newItemKeys: readonly string[]
}

function NotificationIcon({
  label,
  icon: Icon,
}: {
  label: string
  icon: typeof Flame
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="mt-0.5 flex shrink-0 items-center justify-center"
          aria-label={label}
        >
          <Icon className="size-4 shrink-0 text-primary" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

export function TramiteListNotificationIcons({
  item,
  newItemKeys,
}: TramiteListNotificationIconsProps) {
  const notifications = usePortalNotificationsOptional()
  const recordKind = getTramiteListRecordKind(item)
  const copy = tramites.list
  const notificationCopy = portal.notifications

  const hasUnread =
    notifications?.hasUnreadChatter(recordKind, item.id) ?? false
  const isNew = isTramiteListItemNew(item, newItemKeys)
  const hasNewDocument =
    notifications?.hasTramiteNotification(item, 'new_document') ?? false
  const hasStatusChange =
    notifications?.hasTramiteNotification(item, 'status_change') ?? false

  if (!isNew && !hasUnread && !hasNewDocument && !hasStatusChange) {
    return null
  }

  return (
    <>
      {isNew ? (
        <NotificationIcon label={copy.newItemBadge} icon={Flame} />
      ) : null}
      {hasUnread ? (
        <NotificationIcon
          label={notificationCopy.unreadBadge}
          icon={MessageCircleWarning}
        />
      ) : null}
      {hasNewDocument ? (
        <NotificationIcon
          label={notificationCopy.typeNewDocument}
          icon={FileUp}
        />
      ) : null}
      {hasStatusChange ? (
        <NotificationIcon
          label={notificationCopy.typeStatusChange}
          icon={RefreshCw}
        />
      ) : null}
    </>
  )
}
