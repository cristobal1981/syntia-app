'use client'

import type { ClientDashboardSnapshot } from '@/src/modules/portal/application/get-client-dashboard-snapshot'
import {
  ClientHomeStats,
  ClientHomeStatsUnavailable,
} from '@/src/modules/portal/ui/client-home-stats'
import { ClientHomeUnreadFeed } from '@/src/modules/portal/ui/client-home-unread-feed'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'

type ClientHomeDashboardProps = {
  snapshot: ClientDashboardSnapshot | null
}

export function ClientHomeDashboard({ snapshot }: ClientHomeDashboardProps) {
  const notifications = useChatterNotificationsOptional()
  const unreadCount = notifications?.unreadCount ?? 0

  return (
    <div className="flex flex-col gap-8">
      {snapshot ? (
        <ClientHomeStats data={snapshot} unreadCount={unreadCount} />
      ) : (
        <ClientHomeStatsUnavailable />
      )}
      <ClientHomeUnreadFeed />
    </div>
  )
}
