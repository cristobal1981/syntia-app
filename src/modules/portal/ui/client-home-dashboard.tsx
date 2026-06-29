'use client'

import { useLayoutEffect } from 'react'

import type { ClientDashboardSnapshot } from '@/src/modules/portal/application/get-client-dashboard-snapshot'
import type { ChatterNotificationsCheckResult } from '@/src/modules/portal/domain/chatter-notifications-types'
import {
  ClientHomeStats,
  ClientHomeStatsUnavailable,
} from '@/src/modules/portal/ui/client-home-stats'
import { ClientHomeUnreadFeed } from '@/src/modules/portal/ui/client-home-unread-feed'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'

type ClientHomeDashboardProps = {
  snapshot: ClientDashboardSnapshot | null
  initialNotifications: ChatterNotificationsCheckResult | null
}

export function ClientHomeDashboard({
  snapshot,
  initialNotifications,
}: ClientHomeDashboardProps) {
  const notifications = useChatterNotificationsOptional()

  useLayoutEffect(() => {
    if (!initialNotifications?.ok || !notifications) return
    notifications.initializeNotifications({
      unread: initialNotifications.unread,
      readState: initialNotifications.readState,
    })
  }, [initialNotifications, notifications])

  const notificationsLoading =
    (notifications?.notificationsLoading ?? true) && !initialNotifications?.ok
  const unreadCount =
    notifications?.unreadCount ??
    (initialNotifications?.ok ? initialNotifications.unread.length : 0)

  return (
    <div className="flex flex-col gap-8">
      {snapshot ? (
        <ClientHomeStats
          data={snapshot}
          unreadCount={unreadCount}
          notificationsLoading={notificationsLoading}
        />
      ) : (
        <ClientHomeStatsUnavailable />
      )}
      <ClientHomeUnreadFeed
        notificationsLoading={notificationsLoading}
        initialUnread={
          initialNotifications?.ok ? initialNotifications.unread : undefined
        }
      />
    </div>
  )
}
