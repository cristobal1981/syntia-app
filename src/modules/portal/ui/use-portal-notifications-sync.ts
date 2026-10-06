import { useCallback, useEffect, useRef } from 'react'

import { checkPortalNotificationsAction } from '@/src/modules/portal/application/portal-chatter-notifications-actions'
import {
  mergeAccumulatedPortalNotifications,
  pruneResolvedFirmaNotifications,
} from '@/src/modules/portal/domain/compute-portal-notifications'
import type {
  ChatterReadStateMap,
  PortalNotification,
  PortalNotificationsStats,
} from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import {
  getInitialPollIntervalMs,
  getMaxPollIntervalMs,
  nextPollIntervalMs,
  notificationsSignature,
} from '@/src/modules/portal/infrastructure/portal-notifications-poll-scheduler'
import {
  DEFERRED_POLL_MS,
  shouldDeferInitialPoll,
  shouldRefreshPortalPageOnNotificationPoll,
} from '@/src/modules/portal/infrastructure/portal-notifications-poll-timing'
import {
  PortalNotificationsTabCoordinator,
  type PortalNotificationsStateSyncPayload,
} from '@/src/modules/portal/infrastructure/portal-notifications-tab-coordinator'

type LastRecordMessage = {
  scope: 'tramite' | 'consulta' | 'obligacion'
  recordId: number
  message: PortalChatterMessage
} | null

type UsePortalNotificationsSyncArgs = {
  enabled: boolean
  pathnameRef: { current: string }
  pendingFirmaIdsRef: { current: number[] }
  unreadRef: { current: PortalNotification[] }
  readStateRef: { current: ChatterReadStateMap }
  commitUnread: (nextUnread: PortalNotification[]) => PortalNotification[]
  applyReadState: (readState: ChatterReadStateMap) => void
  loadReadStateFromStorage: () => void
  refreshPortalPages: () => void
  setStats: (stats: PortalNotificationsStats) => void
  setLastRecordMessage: (value: LastRecordMessage) => void
  setNotificationsLoading: (loading: boolean) => void
}

/**
 * Posesión exclusiva del polling a Odoo y de la sincronización entre
 * pestañas (coordinador sobre `BroadcastChannel`) — el bloque más delicado
 * de `PortalNotificationsProvider`: un líder entre pestañas sondea y las
 * demás solo reciben el resultado retransmitido, con backoff adaptativo del
 * intervalo (`pollIntervalRef`) y una cola de `setTimeout` que se
 * autoprograma.
 */
export function usePortalNotificationsSync({
  enabled,
  pathnameRef,
  pendingFirmaIdsRef,
  unreadRef,
  readStateRef,
  commitUnread,
  applyReadState,
  loadReadStateFromStorage,
  refreshPortalPages,
  setStats,
  setLastRecordMessage,
  setNotificationsLoading,
}: UsePortalNotificationsSyncArgs) {
  const pollingRef = useRef(false)
  const pollIntervalRef = useRef(getInitialPollIntervalMs())
  const pollTimerRef = useRef<number | null>(null)
  const coordinatorRef = useRef<PortalNotificationsTabCoordinator | null>(null)
  const rateLimitedRef = useRef(false)

  const resetPollInterval = useCallback(() => {
    pollIntervalRef.current = getInitialPollIntervalMs()
  }, [])

  const publishStateToOtherTabs = useCallback(
    (nextUnread: PortalNotification[]) => {
      const coordinator = coordinatorRef.current
      if (!coordinator) return

      const pruned = pruneResolvedFirmaNotifications(
        nextUnread,
        pendingFirmaIdsRef.current
      )

      coordinator.broadcastStateSync({
        sourceTabId: coordinator.getTabId(),
        unread: pruned,
        readState: readStateRef.current,
        pendingFirmaIds: pendingFirmaIdsRef.current,
      })
    },
    [pendingFirmaIdsRef, readStateRef]
  )

  const notifyRecordMutated = useCallback(
    (
      scope: 'tramite' | 'consulta' | 'obligacion',
      recordId: number,
      message?: PortalChatterMessage
    ) => {
      const coordinator = coordinatorRef.current
      if (!coordinator) return
      coordinator.broadcastRecordMutated({
        sourceTabId: coordinator.getTabId(),
        scope,
        recordId,
        ...(message ? { message } : {}),
      })
    },
    []
  )

  const applyRemoteState = useCallback(
    (payload: PortalNotificationsStateSyncPayload) => {
      pendingFirmaIdsRef.current = payload.pendingFirmaIds
      applyReadState(payload.readState)
      const pruned = pruneResolvedFirmaNotifications(
        payload.unread as PortalNotification[],
        payload.pendingFirmaIds
      )
      commitUnread(pruned)
    },
    [applyReadState, commitUnread, pendingFirmaIdsRef]
  )

  const applyPollResult = useCallback(
    (
      result: Extract<
        Awaited<ReturnType<typeof checkPortalNotificationsAction>>,
        { ok: true }
      >,
      options?: { fromBroadcast?: boolean; refreshPages?: boolean }
    ) => {
      pendingFirmaIdsRef.current = result.pendingFirmaIds
      setStats(result.stats)
      const beforeSignature = notificationsSignature(unreadRef.current)
      applyReadState(result.readState)

      const merged = mergeAccumulatedPortalNotifications(
        unreadRef.current,
        result.unread
      )
      const hadChanges =
        result.hasChanges || beforeSignature !== notificationsSignature(merged)

      commitUnread(merged)

      if (!options?.fromBroadcast) {
        pollIntervalRef.current = rateLimitedRef.current
          ? getMaxPollIntervalMs()
          : nextPollIntervalMs(pollIntervalRef.current, hadChanges)
      }

      if (hadChanges) {
        rateLimitedRef.current = false
      }

      if (
        options?.refreshPages &&
        hadChanges &&
        shouldRefreshPortalPageOnNotificationPoll(pathnameRef.current)
      ) {
        refreshPortalPages()
      }
    },
    [applyReadState, commitUnread, pathnameRef, pendingFirmaIdsRef, refreshPortalPages, setStats, unreadRef]
  )

  const refreshNotifications = useCallback(
    async (options?: { force?: boolean }) => {
      if (!enabled || pollingRef.current) return

      if (options?.force) {
        pollIntervalRef.current = getInitialPollIntervalMs()
        rateLimitedRef.current = false
      }

      const coordinator = coordinatorRef.current
      if (coordinator && !coordinator.getIsLeader() && !options?.force) {
        coordinator.requestPollFromLeader()
        return
      }

      pollingRef.current = true

      try {
        const result = await checkPortalNotificationsAction()
        if (!result.ok) {
          if (result.error === 'odoo_rate_limited') {
            rateLimitedRef.current = true
            pollIntervalRef.current = getMaxPollIntervalMs()
          }
          return
        }

        applyPollResult(result, { refreshPages: true })

        coordinator?.broadcastPollResult({
          sourceTabId: coordinator.getTabId(),
          unread: result.unread,
          readState: result.readState,
          pendingFirmaIds: result.pendingFirmaIds,
          hasChanges: result.hasChanges,
          stats: result.stats,
          polledAt: Date.now(),
        })
      } finally {
        pollingRef.current = false
        setNotificationsLoading(false)
      }
    },
    [applyPollResult, enabled, setNotificationsLoading]
  )

  const refreshNotificationsPublic = useCallback(
    () => refreshNotifications({ force: true }),
    [refreshNotifications]
  )

  /** Se autoprograma de forma recurrente (setTimeout que vuelve a llamarse a
   * sí mismo) — se referencia vía ref, no por el nombre de su propio
   * `useCallback`, para que cada timeout pendiente siempre dispare la
   * versión más reciente en vez de quedar atado a la que existía cuando se
   * programó. */
  const scheduleNextPollRef = useRef<() => void>(() => {})

  const scheduleNextPoll = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
    }

    pollTimerRef.current = window.setTimeout(() => {
      pollTimerRef.current = null
      if (document.visibilityState !== 'visible') {
        scheduleNextPollRef.current()
        return
      }

      const coordinator = coordinatorRef.current
      if (coordinator && !coordinator.getIsLeader()) {
        scheduleNextPollRef.current()
        return
      }

      void refreshNotifications().finally(() => {
        scheduleNextPollRef.current()
      })
    }, pollIntervalRef.current)
  }, [refreshNotifications])

  useEffect(() => {
    scheduleNextPollRef.current = scheduleNextPoll
  })

  useEffect(() => {
    if (!enabled) {
      // Efecto de montaje que arranca/desmonta el coordinador de pestañas
      // (BroadcastChannel) — sistema externo real de punta a punta, no una
      // simple derivación de render.
      setNotificationsLoading(false)
      return
    }

    loadReadStateFromStorage()

    const coordinator = new PortalNotificationsTabCoordinator()
    coordinatorRef.current = coordinator
    coordinator.start()

    const unsubscribePollResult = coordinator.onPollResult((payload) => {
      applyPollResult(
        {
          ok: true,
          unread: payload.unread as PortalNotification[],
          readState: payload.readState,
          pendingFirmaIds: payload.pendingFirmaIds,
          hasChanges: payload.hasChanges,
          stats: payload.stats,
        },
        { fromBroadcast: true, refreshPages: payload.hasChanges }
      )
      setNotificationsLoading(false)
    })

    const unsubscribeStateSync = coordinator.onStateSync((payload) => {
      applyRemoteState(payload)
      setNotificationsLoading(false)
    })

    const unsubscribeRecordMutated = coordinator.onRecordMutated((payload) => {
      if (payload.message) {
        setLastRecordMessage({
          scope: payload.scope,
          recordId: payload.recordId,
          message: payload.message,
        })
      }
      if (shouldRefreshPortalPageOnNotificationPoll(pathnameRef.current)) {
        refreshPortalPages()
      }
    })

    const unsubscribePollRequest = coordinator.onPollRequest(() => {
      void refreshNotifications({ force: true })
    })

    const initialDelay = shouldDeferInitialPoll() ? DEFERRED_POLL_MS : 0

    const initialTimer = window.setTimeout(() => {
      void refreshNotifications().finally(() => {
        scheduleNextPoll()
      })
    }, initialDelay)

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      if (rateLimitedRef.current) return
      pollIntervalRef.current = getInitialPollIntervalMs()
      void refreshNotifications({ force: true })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(initialTimer)
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      unsubscribePollResult()
      unsubscribeStateSync()
      unsubscribeRecordMutated()
      unsubscribePollRequest()
      coordinator.destroy()
      coordinatorRef.current = null
    }
  }, [
    applyPollResult,
    applyRemoteState,
    enabled,
    loadReadStateFromStorage,
    pathnameRef,
    refreshNotifications,
    refreshPortalPages,
    scheduleNextPoll,
    setLastRecordMessage,
    setNotificationsLoading,
  ])

  return {
    refreshNotifications: refreshNotificationsPublic,
    notifyRecordMutated,
    publishStateToOtherTabs,
    resetPollInterval,
  }
}
