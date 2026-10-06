'use client'

import { useLayoutEffect } from 'react'

import type { PortalRole } from '@/src/modules/auth/domain/types'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import type {
  ClientDashboardSnapshot,
  ClientDashboardSnapshotResult,
} from '@/src/modules/portal/application/get-client-dashboard-snapshot'
import type { PortalNotificationsCheckResult } from '@/src/modules/portal/domain/portal-notifications-types'
import {
  ClientHomeStats,
  ClientHomeStatsUnavailable,
} from '@/src/modules/portal/ui/client-home-stats'
import { ClientHomeUnreadFeed } from '@/src/modules/portal/ui/client-home-unread-feed'
import { usePortalNotificationsOptional } from '@/src/modules/portal/ui/portal-notifications-context'

type ClientHomeDashboardProps = {
  role: PortalRole
  allowedSections?: Set<WorkerSectionHref>
  snapshot: ClientDashboardSnapshot | null
  snapshotError?: Extract<
    ClientDashboardSnapshotResult,
    { ok: false }
  >['error'] | null
  initialNotifications: PortalNotificationsCheckResult | null
}

export function ClientHomeDashboard({
  role,
  allowedSections,
  snapshot,
  snapshotError = null,
  initialNotifications,
}: ClientHomeDashboardProps) {
  const notifications = usePortalNotificationsOptional()

  useLayoutEffect(() => {
    if (!initialNotifications?.ok || !notifications) return
    notifications.initializeNotifications({
      unread: initialNotifications.unread,
      readState: initialNotifications.readState,
      stats: initialNotifications.stats,
    })
  }, [initialNotifications, notifications])

  const notificationsLoading =
    (notifications?.notificationsLoading ?? true) && !initialNotifications?.ok

  // Preferir las stats en vivo del poll (sincronizadas entre pestañas vía
  // BroadcastChannel) sobre el snapshot estático del SSR, para que este
  // contador no se quede desfasado frente al de novedades.
  const liveSnapshot = notifications?.stats ?? snapshot

  return (
    <div className="flex flex-col gap-8">
      {liveSnapshot ? (
        <ClientHomeStats data={liveSnapshot} role={role} allowedSections={allowedSections} />
      ) : (
        <ClientHomeStatsUnavailable error={snapshotError} />
      )}
      <ClientHomeUnreadFeed notificationsLoading={notificationsLoading} />
    </div>
  )
}
