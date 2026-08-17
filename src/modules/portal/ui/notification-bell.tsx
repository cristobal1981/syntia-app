'use client'

import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'
import { PortalNotificationItemMeta } from '@/src/modules/portal/ui/portal-notification-item-meta'

type NotificationBellProps = {
  className?: string
}

function formatNotificationDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function NotificationBell({ className }: NotificationBellProps) {
  const notifications = useChatterNotificationsOptional()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  if (!notifications) return null

  const { unread, unreadCount, openNotification } = notifications
  const copy = portal.notifications
  const tooltipContent =
    unreadCount > 0
      ? copy.tooltipUnread.replace('{count}', String(unreadCount))
      : copy.label

  return (
    <div className={cn('relative', className)}>
      <PortalActionTooltip content={tooltipContent} side="bottom" disabled={open}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="relative flex size-8 cursor-pointer items-center justify-center rounded-md text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-9"
          aria-label={unreadCount > 0 ? `${copy.label}: ${tooltipContent}` : copy.label}
          aria-expanded={open}
          aria-haspopup="true"
        >
          <Bell className="size-4 sm:size-[1.125rem]" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>
      </PortalActionTooltip>

      {open ? (
        <div
          ref={panelRef}
          className="absolute top-full right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover text-popover-foreground shadow-lg max-lg:fixed max-lg:top-14 max-lg:left-3 max-lg:right-3 max-lg:mt-0 max-lg:w-auto"
          role="dialog"
          aria-label={copy.label}
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{copy.label}</p>
          </div>

          {unread.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-medium text-foreground">{copy.emptyTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.emptyDescription}
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {unread.map((item) => (
                <li key={`${item.reason}-${item.scope}-${item.recordId}`}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    onClick={() => {
                      setOpen(false)
                      openNotification(item)
                    }}
                  >
                    <span className="line-clamp-2 text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <PortalNotificationItemMeta item={item} />
                      {item.latestDate ? (
                        <time dateTime={item.latestDate}>
                          {formatNotificationDate(item.latestDate)}
                        </time>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
