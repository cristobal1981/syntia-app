'use client'

import { AppLink, appLinkPortalClassName } from '@/components/ui/app-link'
import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'

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
  const unread = notifications?.unread.slice(0, 3) ?? []

  return (
    <section aria-labelledby="client-home-unread">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="client-home-unread"
          className="font-sans text-lg font-semibold text-foreground"
        >
          {copy.unreadTitle}
        </h2>
        <AppLink
          href="/tramites"
          className={cn('shrink-0 text-sm', appLinkPortalClassName)}
        >
          {copy.unreadViewAll}
        </AppLink>
      </div>

      {unread.length === 0 ? (
        <div className="portal-home-card rounded-xl px-5 py-6 text-sm text-muted-foreground">
          {copy.unreadEmpty}
        </div>
      ) : (
        <ul className="portal-home-card divide-y divide-border overflow-hidden rounded-xl">
          {unread.map((item) => (
            <li key={`${item.listKind}-${item.recordId}`}>
              <button
                type="button"
                className="flex w-full flex-col gap-1 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                onClick={() => notifications?.openNotification(item)}
              >
                <span className="line-clamp-2 text-sm font-medium text-foreground">
                  {item.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.listKind === 'consulta'
                    ? portal.notifications.typeConsulta
                    : portal.notifications.typeTramite}
                  {item.latestDate ? (
                    <>
                      <span aria-hidden> · </span>
                      <time dateTime={item.latestDate}>
                        {formatNotificationDate(item.latestDate)}
                      </time>
                    </>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
