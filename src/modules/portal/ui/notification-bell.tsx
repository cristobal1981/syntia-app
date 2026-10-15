'use client'

import { Bell, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { usePortalNotificationsOptional } from '@/src/modules/portal/ui/portal-notifications-context'
import { PortalNotificationItemMeta } from '@/src/modules/portal/ui/portal-notification-item-meta'

const PANEL_EXIT_MS = 150

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
  const notifications = usePortalNotificationsOptional()
  const [open, setOpen] = useState(false)
  // El panel sigue montado el tiempo de la animación de salida.
  const [mounted, setMounted] = useState(false)
  if (open && !mounted) setMounted(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) return
    const timeout = setTimeout(() => setMounted(false), PANEL_EXIT_MS)
    return () => clearTimeout(timeout)
  }, [open])

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

  const { unread, unreadCount, openNotification, dismissNotification, dismissAllNotifications } =
    notifications
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

      {mounted ? (
        <div
          ref={panelRef}
          data-state={open ? 'open' : 'closed'}
          className={cn(
            'absolute top-full right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-lg border border-border bg-popover text-popover-foreground shadow-lg max-lg:fixed max-lg:top-14 max-lg:left-3 max-lg:right-3 max-lg:mt-0 max-lg:w-auto',
            // Entrada y salida sutiles (mismo gesto que el panel del perfil).
            'duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-1',
            'data-[state=closed]:pointer-events-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-1',
            'motion-reduce:animate-none'
          )}
          role="dialog"
          aria-label={copy.label}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{copy.label}</p>
            {unread.length > 0 ? (
              <button
                type="button"
                onClick={dismissAllNotifications}
                className="cursor-pointer rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {copy.dismissAll}
              </button>
            ) : null}
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
                <li
                  key={`${item.reason}-${item.scope}-${item.recordId}`}
                  className="flex items-start transition-colors hover:bg-accent focus-within:bg-accent"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-2 pl-4 text-left focus-visible:outline-none"
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
                  <button
                    type="button"
                    onClick={() => dismissNotification(item)}
                    aria-label={copy.dismiss}
                    title={copy.dismiss}
                    className="mt-2.5 mr-3 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X className="size-3.5" aria-hidden />
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
