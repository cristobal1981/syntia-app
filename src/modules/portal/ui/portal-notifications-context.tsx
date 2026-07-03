'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'

import {
  ackPortalNotificationAction,
  checkPortalNotificationsAction,
  markChatterConversationSeenAction,
} from '@/src/modules/portal/application/portal-chatter-notifications-actions'
import type {
  ChatterReadStateMap,
  PortalNotification,
  PortalNotificationReason,
} from '@/src/modules/portal/domain/portal-notifications-types'
import {
  chatterReadStateKey,
  openParamFromListKind,
} from '@/src/modules/portal/domain/portal-notifications-types'
import {
  mergeAccumulatedPortalNotifications,
  notificationMatchesTramiteRecord,
  pruneResolvedFirmaNotifications,
  removePortalNotificationsByRecord,
  removePortalNotificationsByScope,
} from '@/src/modules/portal/domain/compute-portal-notifications'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import {
  getInitialPollIntervalMs,
  getMaxPollIntervalMs,
  nextPollIntervalMs,
  notificationsSignature,
} from '@/src/modules/portal/infrastructure/portal-notifications-poll-scheduler'
import {
  PortalNotificationsTabCoordinator,
  type PortalNotificationsStateSyncPayload,
} from '@/src/modules/portal/infrastructure/portal-notifications-tab-coordinator'
import {
  dedupedServerAction,
  serverActionDedupKey,
} from '@/src/modules/portal/infrastructure/server-action-dedup'

const CHATTER_READ_STATE_STORAGE_KEY = 'syntia-chatter-read-state'
const DEFERRED_POLL_MS = 2_000

function shouldDeferInitialPoll(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('open')
}

type PortalNotificationsContextValue = {
  unread: PortalNotification[]
  unreadCount: number
  notificationsLoading: boolean
  hasUnreadChatter: (recordKind: PortalRecordKind, recordId: number) => boolean
  hasTramiteNotification: (
    item: { kind: 'tramite' | 'consulta'; id: number },
    reason: Extract<PortalNotificationReason, 'new_document' | 'status_change'>
  ) => boolean
  dismissNewTramiteNotification: (
    recordKind: PortalRecordKind,
    recordId: number
  ) => void
  markConversationSeen: (
    recordKind: PortalRecordKind,
    recordId: number,
    lastSeenMessageId: number
  ) => Promise<void>
  ackDocumentsSeen: (
    scope: 'tramite' | 'consulta' | 'obligacion',
    recordId: number,
    attachmentCount: number
  ) => Promise<void>
  ackStatusChangeSeen: (
    scope: 'tramite' | 'consulta' | 'obligacion',
    recordId: number
  ) => Promise<void>
  openNotification: (notification: PortalNotification) => void
  refreshNotifications: () => Promise<void>
  initializeNotifications: (payload: {
    unread: PortalNotification[]
    readState: ChatterReadStateMap
  }) => void
}

const PortalNotificationsContext =
  createContext<PortalNotificationsContextValue | null>(null)

function loadReadStateFromStorage(): ChatterReadStateMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CHATTER_READ_STATE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ChatterReadStateMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveReadStateToStorage(readState: ChatterReadStateMap) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CHATTER_READ_STATE_STORAGE_KEY, JSON.stringify(readState))
  } catch {
    // ignore quota errors
  }
}

function mergeReadState(
  current: ChatterReadStateMap,
  incoming: ChatterReadStateMap
): ChatterReadStateMap {
  const merged = { ...current }
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = Math.max(merged[key] ?? 0, value)
  }
  return merged
}

function removeNotificationFromList(
  items: PortalNotification[],
  notification: PortalNotification
): PortalNotification[] {
  return items.filter(
    (item) =>
      !(
        item.scope === notification.scope &&
        item.recordId === notification.recordId &&
        item.reason === notification.reason
      )
  )
}

type PortalNotificationsProviderProps = {
  children: ReactNode
  enabled: boolean
}

export function PortalNotificationsProvider({
  children,
  enabled,
}: PortalNotificationsProviderProps) {
  const router = useRouter()
  const [, startPortalRefresh] = useTransition()
  const [unread, setUnread] = useState<PortalNotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(enabled)
  const unreadRef = useRef<PortalNotification[]>([])
  const readStateRef = useRef<ChatterReadStateMap>({})
  const pollingRef = useRef(false)
  const markingRef = useRef<Set<string>>(new Set())
  const documentsAckInFlightRef = useRef<Set<string>>(new Set())
  const ssrHydratedRef = useRef(false)
  const pollIntervalRef = useRef(getInitialPollIntervalMs())
  const pollTimerRef = useRef<number | null>(null)
  const coordinatorRef = useRef<PortalNotificationsTabCoordinator | null>(null)
  const rateLimitedRef = useRef(false)
  const pendingFirmaIdsRef = useRef<number[]>([])

  const commitUnread = useCallback((nextUnread: PortalNotification[]) => {
    const pruned = pruneResolvedFirmaNotifications(
      nextUnread,
      pendingFirmaIdsRef.current
    )
    unreadRef.current = pruned
    setUnread(pruned)
    return pruned
  }, [])

  const refreshPortalPages = useCallback(() => {
    startPortalRefresh(() => {
      router.refresh()
    })
  }, [router])

  const applyReadState = useCallback((readState: ChatterReadStateMap) => {
    readStateRef.current = mergeReadState(readStateRef.current, readState)
    saveReadStateToStorage(readStateRef.current)
  }, [])

  const publishStateToOtherTabs = useCallback((nextUnread: PortalNotification[]) => {
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
  }, [])

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
    [applyReadState, commitUnread]
  )

  const initializeNotifications = useCallback(
    (payload: {
      unread: PortalNotification[]
      readState: ChatterReadStateMap
    }) => {
      if (ssrHydratedRef.current) return
      ssrHydratedRef.current = true
      readStateRef.current = mergeReadState(
        loadReadStateFromStorage(),
        payload.readState
      )
      saveReadStateToStorage(readStateRef.current)
      commitUnread(payload.unread)
      setNotificationsLoading(false)
    },
    [commitUnread]
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
      const beforeSignature = notificationsSignature(unreadRef.current)
      applyReadState(result.readState)

      const merged = mergeAccumulatedPortalNotifications(
        unreadRef.current,
        result.unread
      )
      const hadChanges =
        result.hasChanges ||
        beforeSignature !== notificationsSignature(merged)

      commitUnread(merged)

      if (!options?.fromBroadcast) {
        pollIntervalRef.current = rateLimitedRef.current
          ? getMaxPollIntervalMs()
          : nextPollIntervalMs(pollIntervalRef.current, hadChanges)
      }

      if (hadChanges) {
        rateLimitedRef.current = false
      }

      if (options?.refreshPages && hadChanges) {
        refreshPortalPages()
      }
    },
    [applyReadState, commitUnread, refreshPortalPages]
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
          polledAt: Date.now(),
        })
      } finally {
        pollingRef.current = false
        setNotificationsLoading(false)
      }
    },
    [applyPollResult, enabled]
  )

  const refreshNotificationsPublic = useCallback(
    () => refreshNotifications({ force: true }),
    [refreshNotifications]
  )

  const scheduleNextPoll = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
    }

    pollTimerRef.current = window.setTimeout(() => {
      pollTimerRef.current = null
      if (document.visibilityState !== 'visible') {
        scheduleNextPoll()
        return
      }

      const coordinator = coordinatorRef.current
      if (coordinator && !coordinator.getIsLeader()) {
        scheduleNextPoll()
        return
      }

      void refreshNotifications().finally(() => {
        scheduleNextPoll()
      })
    }, pollIntervalRef.current)
  }, [refreshNotifications])

  useEffect(() => {
    if (!enabled) {
      setNotificationsLoading(false)
      return
    }

    readStateRef.current = loadReadStateFromStorage()

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
        },
        { fromBroadcast: true, refreshPages: payload.hasChanges }
      )
      setNotificationsLoading(false)
    })

    const unsubscribeStateSync = coordinator.onStateSync((payload) => {
      applyRemoteState(payload)
      setNotificationsLoading(false)
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

    function handleStorageSync(event: StorageEvent) {
      if (event.key !== CHATTER_READ_STATE_STORAGE_KEY || !event.newValue) return
      try {
        const parsed = JSON.parse(event.newValue) as ChatterReadStateMap
        if (!parsed || typeof parsed !== 'object') return
        readStateRef.current = mergeReadState(readStateRef.current, parsed)
      } catch {
        // ignore invalid payload
      }
    }

    window.addEventListener('storage', handleStorageSync)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(initialTimer)
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
      }
      window.removeEventListener('storage', handleStorageSync)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      unsubscribePollResult()
      unsubscribeStateSync()
      unsubscribePollRequest()
      coordinator.destroy()
      coordinatorRef.current = null
    }
  }, [
    applyPollResult,
    applyRemoteState,
    enabled,
    refreshNotifications,
    scheduleNextPoll,
  ])

  const dismissNewTramiteNotification = useCallback(
    (recordKind: PortalRecordKind, recordId: number) => {
      const nextUnread = removePortalNotificationsByRecord(
        unreadRef.current,
        recordKind,
        recordId,
        'new_tramite'
      )
      commitUnread(nextUnread)
      publishStateToOtherTabs(nextUnread)
    },
    [commitUnread, publishStateToOtherTabs]
  )

  const markConversationSeen = useCallback(
    async (
      recordKind: PortalRecordKind,
      recordId: number,
      lastSeenMessageId: number
    ) => {
      if (!enabled) return

      const key = chatterReadStateKey(recordKind, recordId)
      const matchingUnread = unreadRef.current.find(
        (item) =>
          item.reason === 'unread_chatter' &&
          notificationMatchesTramiteRecord(item, recordKind, recordId)
      )
      const effectiveLastSeen = Math.max(
        lastSeenMessageId,
        matchingUnread?.latestMessageId ?? 0
      )

      const current = readStateRef.current[key] ?? 0
      if (effectiveLastSeen <= current) {
        const nextUnread = removePortalNotificationsByRecord(
          unreadRef.current,
          recordKind,
          recordId,
          'unread_chatter'
        )
        commitUnread(nextUnread)
        publishStateToOtherTabs(unreadRef.current)
        return
      }

      if (markingRef.current.has(key)) return
      markingRef.current.add(key)

      const optimisticUnread = removePortalNotificationsByRecord(
        unreadRef.current,
        recordKind,
        recordId,
        'unread_chatter'
      )
      commitUnread(optimisticUnread)
      applyReadState({ [key]: effectiveLastSeen })
      publishStateToOtherTabs(optimisticUnread)

      try {
        const result = await markChatterConversationSeenAction({
          kind: recordKind,
          recordId,
          lastSeenMessageId: effectiveLastSeen,
        })

        if (result.ok) {
          applyReadState(result.readState)
          publishStateToOtherTabs(unreadRef.current)
        }
      } finally {
        markingRef.current.delete(key)
      }
    },
    [applyReadState, commitUnread, enabled, publishStateToOtherTabs]
  )

  const ackDocumentsSeen = useCallback(
    async (
      scope: 'tramite' | 'consulta' | 'obligacion',
      recordId: number,
      attachmentCount: number
    ) => {
      if (!enabled) return

      const ackKey = `${scope}:${recordId}:new_document`
      if (documentsAckInFlightRef.current.has(ackKey)) return
      documentsAckInFlightRef.current.add(ackKey)

      const nextUnread = removePortalNotificationsByScope(
        unreadRef.current,
        scope,
        recordId,
        'new_document'
      )
      commitUnread(nextUnread)
      publishStateToOtherTabs(unreadRef.current)

      pollIntervalRef.current = getInitialPollIntervalMs()

      try {
        await dedupedServerAction(
          serverActionDedupKey('ackPortalNotification', {
            scope,
            recordId,
            reason: 'new_document',
            attachmentCount,
          }),
          () =>
            ackPortalNotificationAction({
              scope,
              recordId,
              reason: 'new_document',
              attachmentCount,
            })
        )
      } catch {
        // UI already optimistically dismissed
      } finally {
        documentsAckInFlightRef.current.delete(ackKey)
      }
    },
    [commitUnread, enabled, publishStateToOtherTabs]
  )

  const ackStatusChangeSeen = useCallback(
    async (
      scope: 'tramite' | 'consulta' | 'obligacion',
      recordId: number
    ) => {
      if (!enabled) return

      const ackKey = `${scope}:${recordId}:status_change`
      if (documentsAckInFlightRef.current.has(ackKey)) return
      documentsAckInFlightRef.current.add(ackKey)

      const nextUnread = removePortalNotificationsByScope(
        unreadRef.current,
        scope,
        recordId,
        'status_change'
      )
      commitUnread(nextUnread)
      publishStateToOtherTabs(unreadRef.current)

      pollIntervalRef.current = getInitialPollIntervalMs()

      try {
        await dedupedServerAction(
          serverActionDedupKey('ackPortalNotification', {
            scope,
            recordId,
            reason: 'status_change',
          }),
          () =>
            ackPortalNotificationAction({
              scope,
              recordId,
              reason: 'status_change',
            })
        )
      } catch {
        // UI already optimistically dismissed
      } finally {
        documentsAckInFlightRef.current.delete(ackKey)
      }
    },
    [commitUnread, enabled, publishStateToOtherTabs]
  )

  const openNotification = useCallback(
    (notification: PortalNotification) => {
      const nextUnread = removeNotificationFromList(unreadRef.current, notification)
      commitUnread(nextUnread)
      publishStateToOtherTabs(unreadRef.current)

      if (
        notification.reason === 'new_document' ||
        notification.reason === 'status_change' ||
        notification.reason === 'new_firma' ||
        notification.reason === 'firma_due_soon'
      ) {
        void ackPortalNotificationAction({
          scope: notification.scope,
          recordId: notification.recordId,
          reason: notification.reason,
        })
      }

      if (notification.scope === 'firma') {
        router.push('/firmas')
        return
      }

      if (notification.scope === 'obligacion') {
        const tab =
          notification.reason === 'new_document' ? 'documents' : 'documents'
        router.push(
          `/obligaciones?open=${encodeURIComponent(`task-${notification.recordId}`)}&tab=${tab}`
        )
        return
      }

      if (notification.listKind) {
        const openParam = openParamFromListKind(
          notification.listKind,
          notification.recordId
        )
        const tab =
          notification.reason === 'new_document'
            ? 'documents'
            : notification.reason === 'status_change'
              ? 'conversation'
              : 'conversation'
        router.push(
          `/tramites?open=${encodeURIComponent(openParam)}&tab=${tab}`
        )
      }
    },
    [commitUnread, publishStateToOtherTabs, router]
  )

  const hasUnreadChatter = useCallback(
    (recordKind: PortalRecordKind, recordId: number) =>
      unread.some(
        (item) =>
          item.reason === 'unread_chatter' &&
          notificationMatchesTramiteRecord(item, recordKind, recordId)
      ),
    [unread]
  )

  const hasTramiteNotification = useCallback(
    (
      item: { kind: 'tramite' | 'consulta'; id: number },
      reason: Extract<PortalNotificationReason, 'new_document' | 'status_change'>
    ) =>
      unread.some(
        (notification) =>
          notification.reason === reason &&
          notification.scope === item.kind &&
          notification.recordId === item.id
      ),
    [unread]
  )

  const value = useMemo(
    () => ({
      unread,
      unreadCount: unread.length,
      notificationsLoading,
      hasUnreadChatter,
      hasTramiteNotification,
      dismissNewTramiteNotification,
      markConversationSeen,
      ackDocumentsSeen,
      ackStatusChangeSeen,
      openNotification,
      refreshNotifications: refreshNotificationsPublic,
      initializeNotifications,
    }),
    [
      unread,
      notificationsLoading,
      hasUnreadChatter,
      hasTramiteNotification,
      dismissNewTramiteNotification,
      markConversationSeen,
      ackDocumentsSeen,
      ackStatusChangeSeen,
      openNotification,
      refreshNotificationsPublic,
      initializeNotifications,
    ]
  )

  return (
    <PortalNotificationsContext.Provider value={value}>
      {children}
    </PortalNotificationsContext.Provider>
  )
}

export function usePortalNotifications() {
  const context = useContext(PortalNotificationsContext)
  if (!context) {
    throw new Error(
      'usePortalNotifications must be used within PortalNotificationsProvider'
    )
  }
  return context
}

export function usePortalNotificationsOptional() {
  return useContext(PortalNotificationsContext)
}
