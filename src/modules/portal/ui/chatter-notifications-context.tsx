'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'

import {
  checkChatterNotificationsAction,
  markChatterConversationSeenAction,
} from '@/src/modules/portal/application/portal-chatter-notifications-actions'
import type {
  ChatterReadStateMap,
  ChatterUnreadNotification,
  PortalNotificationReason,
} from '@/src/modules/portal/domain/chatter-notifications-types'
import {
  chatterReadStateKey,
  openParamFromListKind,
} from '@/src/modules/portal/domain/chatter-notifications-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'

const CHATTER_READ_STATE_STORAGE_KEY = 'syntia-chatter-read-state'
const POLL_INTERVAL_MS = 60_000

type ChatterNotificationsContextValue = {
  unread: ChatterUnreadNotification[]
  unreadCount: number
  notificationsLoading: boolean
  hasUnreadChatter: (recordKind: PortalRecordKind, recordId: number) => boolean
  dismissNewTramiteNotification: (
    recordKind: PortalRecordKind,
    recordId: number
  ) => void
  markConversationSeen: (
    recordKind: PortalRecordKind,
    recordId: number,
    lastSeenMessageId: number
  ) => Promise<void>
  openNotification: (notification: ChatterUnreadNotification) => void
  refreshNotifications: () => Promise<void>
  initializeNotifications: (payload: {
    unread: ChatterUnreadNotification[]
    readState: ChatterReadStateMap
  }) => void
}

function matchesNotificationRecord(
  item: ChatterUnreadNotification,
  recordKind: PortalRecordKind,
  recordId: number
): boolean {
  return item.recordKind === recordKind && item.recordId === recordId
}

function removeNotificationsByRecord(
  items: ChatterUnreadNotification[],
  recordKind: PortalRecordKind,
  recordId: number,
  reason?: PortalNotificationReason
): ChatterUnreadNotification[] {
  const next = items.filter((item) => {
    if (!matchesNotificationRecord(item, recordKind, recordId)) return true
    if (!reason) return false
    return item.reason !== reason
  })
  return next.length === items.length ? items : next
}

const ChatterNotificationsContext =
  createContext<ChatterNotificationsContextValue | null>(null)

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

type ChatterNotificationsProviderProps = {
  children: ReactNode
  enabled: boolean
}

export function ChatterNotificationsProvider({
  children,
  enabled,
}: ChatterNotificationsProviderProps) {
  const router = useRouter()
  const [unread, setUnread] = useState<ChatterUnreadNotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(enabled)
  const unreadRef = useRef<ChatterUnreadNotification[]>([])
  const readStateRef = useRef<ChatterReadStateMap>({})
  const pollingRef = useRef(false)
  const markingRef = useRef<Set<string>>(new Set())
  const skipInitialFetchRef = useRef(false)

  useEffect(() => {
    unreadRef.current = unread
  }, [unread])

  const applyReadState = useCallback((readState: ChatterReadStateMap) => {
    readStateRef.current = mergeReadState(readStateRef.current, readState)
    saveReadStateToStorage(readStateRef.current)
  }, [])

  const initializeNotifications = useCallback(
    (payload: {
      unread: ChatterUnreadNotification[]
      readState: ChatterReadStateMap
    }) => {
      if (skipInitialFetchRef.current) return
      skipInitialFetchRef.current = true
      readStateRef.current = mergeReadState(
        loadReadStateFromStorage(),
        payload.readState
      )
      saveReadStateToStorage(readStateRef.current)
      setUnread(payload.unread)
      setNotificationsLoading(false)
    },
    []
  )

  const refreshNotifications = useCallback(async () => {
    if (!enabled || pollingRef.current) return
    pollingRef.current = true

    try {
      const result = await checkChatterNotificationsAction()
      if (!result.ok) return

      applyReadState(result.readState)
      setUnread(result.unread)
    } finally {
      pollingRef.current = false
      setNotificationsLoading(false)
    }
  }, [applyReadState, enabled])

  useEffect(() => {
    if (!enabled) {
      setNotificationsLoading(false)
      return
    }

    readStateRef.current = loadReadStateFromStorage()

    const timer = window.setTimeout(() => {
      if (skipInitialFetchRef.current) return
      void refreshNotifications()
    }, 0)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void refreshNotifications()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void refreshNotifications()
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearInterval(intervalId)
    }
  }, [enabled, refreshNotifications])

  const dismissNewTramiteNotification = useCallback(
    (recordKind: PortalRecordKind, recordId: number) => {
      setUnread((items) =>
        removeNotificationsByRecord(items, recordKind, recordId, 'new_tramite')
      )
    },
    []
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
          matchesNotificationRecord(item, recordKind, recordId)
      )
      const effectiveLastSeen = Math.max(
        lastSeenMessageId,
        matchingUnread?.latestMessageId ?? 0
      )

      const current = readStateRef.current[key] ?? 0
      if (effectiveLastSeen <= current) {
        setUnread((items) =>
          removeNotificationsByRecord(items, recordKind, recordId, 'unread_chatter')
        )
        return
      }

      if (markingRef.current.has(key)) return
      markingRef.current.add(key)

      queueMicrotask(() => {
        setUnread((items) =>
          removeNotificationsByRecord(items, recordKind, recordId, 'unread_chatter')
        )
      })

      applyReadState({ [key]: effectiveLastSeen })

      try {
        const result = await markChatterConversationSeenAction({
          kind: recordKind,
          recordId,
          lastSeenMessageId: effectiveLastSeen,
        })

        if (result.ok) {
          applyReadState(result.readState)
        }
      } finally {
        markingRef.current.delete(key)
      }
    },
    [applyReadState, enabled]
  )

  const openNotification = useCallback(
    (notification: ChatterUnreadNotification) => {
      if (notification.reason === 'new_tramite') {
        dismissNewTramiteNotification(
          notification.recordKind,
          notification.recordId
        )
      }

      const openParam = openParamFromListKind(
        notification.listKind,
        notification.recordId
      )
      router.push(`/tramites?open=${encodeURIComponent(openParam)}&tab=conversation`)
    },
    [dismissNewTramiteNotification, router]
  )

  const hasUnreadChatter = useCallback(
    (recordKind: PortalRecordKind, recordId: number) =>
      unread.some(
        (item) =>
          item.reason === 'unread_chatter' &&
          matchesNotificationRecord(item, recordKind, recordId)
      ),
    [unread]
  )

  const value = useMemo(
    () => ({
      unread,
      unreadCount: unread.length,
      notificationsLoading,
      hasUnreadChatter,
      dismissNewTramiteNotification,
      markConversationSeen,
      openNotification,
      refreshNotifications,
      initializeNotifications,
    }),
    [
      unread,
      notificationsLoading,
      hasUnreadChatter,
      dismissNewTramiteNotification,
      markConversationSeen,
      openNotification,
      refreshNotifications,
      initializeNotifications,
    ]
  )

  return (
    <ChatterNotificationsContext.Provider value={value}>
      {children}
    </ChatterNotificationsContext.Provider>
  )
}

export function useChatterNotifications() {
  const context = useContext(ChatterNotificationsContext)
  if (!context) {
    throw new Error(
      'useChatterNotifications must be used within ChatterNotificationsProvider'
    )
  }
  return context
}

export function useChatterNotificationsOptional() {
  return useContext(ChatterNotificationsContext)
}
