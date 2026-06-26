'use client'

import { AppLink, appLinkPortalClassName } from '@/components/ui/app-link'
import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'
import { PortalNotificationItemMeta } from '@/src/modules/portal/ui/portal-notification-item-meta'

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

export function ClientHomeUnreadFeed() {
  const notifications = useChatterNotificationsOptional()
  const copy = portal.home.client
  const unreadCount = notifications?.unreadCount ?? 0
  const unread = notifications?.unread.slice(0, 3) ?? []
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
          {unreadCount > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">
              {unreadCount}
            </span>
          ) : null}
        </div>

      {unread.length === 0 ? (
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
