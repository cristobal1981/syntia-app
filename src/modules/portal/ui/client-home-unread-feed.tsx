'use client'

import { Loader2 } from 'lucide-react'

import { AppLink, appLinkPortalClassName } from '@/components/ui/app-link'
import { Skeleton } from '@/components/ui/skeleton'
import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'
import { PortalNotificationItemMeta } from '@/src/modules/portal/ui/portal-notification-item-meta'
import type { ChatterUnreadNotification } from '@/src/modules/portal/domain/chatter-notifications-types'

function formatNotificationDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

type ClientHomeUnreadFeedProps = {
  notificationsLoading?: boolean
  initialUnread?: ChatterUnreadNotification[]
}

export function ClientHomeUnreadFeed({
  notificationsLoading = false,
  initialUnread,
}: ClientHomeUnreadFeedProps) {
  const notifications = useChatterNotificationsOptional()
  const copy = portal.home.client
  const contextUnread = notifications?.unread ?? []
  const unreadSource =
    contextUnread.length > 0 || !initialUnread?.length
      ? contextUnread
      : initialUnread
  const unreadCount = unreadSource.length
  const unread = unreadSource.slice(0, 3)
  const overflowCount = Math.max(0, unreadCount - 3)

  return (
    <section aria-labelledby="client-home-unread">
      <div className="mb-4 flex items-center gap-2">
        <h2
          id="client-home-unread"
          className="font-sans text-lg font-semibold text-foreground"
        >
          {copy.unreadTitle}
        </h2>
        {notificationsLoading ? (
          <Loader2
            className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden
          />
        ) : unreadCount > 0 ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">
            {unreadCount}
          </span>
        ) : null}
      </div>

      {notificationsLoading ? (
        <div
          className="portal-home-card rounded-xl px-5 py-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="sr-only">{copy.unreadLoading}</span>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ) : unread.length === 0 ? (
        <div className="portal-home-card rounded-xl px-5 py-6 text-sm text-muted-foreground">
          {copy.unreadEmpty}
        </div>
      ) : (
        <div className="portal-home-card overflow-hidden rounded-xl">
          <ul className="divide-y divide-border">
            {unread.map((item) => (
              <li key={`${item.reason}-${item.listKind}-${item.recordId}`}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-1.5 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  onClick={() => notifications?.openNotification(item)}
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
          {overflowCount > 0 ? (
            <div className="border-t border-border">
              <AppLink
                href="/tramites"
                className={cn(
                  'flex w-full px-5 py-3 text-sm transition-colors hover:bg-muted/40',
                  appLinkPortalClassName
                )}
              >
                {copy.unreadMore.replace('{count}', String(overflowCount))}
              </AppLink>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
