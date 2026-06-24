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
} from '@/src/modules/portal/domain/chatter-notifications-types'
import {
  chatterReadStateKey,
  openParamFromListKind,
} from '@/src/modules/portal/domain/chatter-notifications-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'

const CHATTER_READ_STATE_STORAGE_KEY = 'syntia-chatter-read-state'
const POLL_INTERVAL_MS = 60_000
const PENDING_NAVIGATION_TIMEOUT_MS = 20_000

export type ChatterPendingNavigation = {
  listKind: 'tramite' | 'incidencia'
  recordId: number
  name: string
}

type ChatterNotificationsContextValue = {
  unread: ChatterUnreadNotification[]
  unreadCount: number
  pendingNavigation: ChatterPendingNavigation | null
  isUnread: (recordKind: PortalRecordKind, recordId: number) => boolean
  markConversationSeen: (
    recordKind: PortalRecordKind,
    recordId: number,
    lastSeenMessageId: number
  ) => Promise<void>
  openNotification: (notification: ChatterUnreadNotification) => void
  clearPendingNavigation: () => void
  refreshNotifications: () => Promise<void>
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
  const [pendingNavigation, setPendingNavigation] =
    useState<ChatterPendingNavigation | null>(null)
  const unreadRef = useRef<ChatterUnreadNotification[]>([])
  const readStateRef = useRef<ChatterReadStateMap>({})
  const pollingRef = useRef(false)
  const markingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    unreadRef.current = unread
  }, [unread])

  const applyReadState = useCallback((readState: ChatterReadStateMap) => {
    readStateRef.current = mergeReadState(readStateRef.current, readState)
    saveReadStateToStorage(readStateRef.current)
  }, [])

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
    }
  }, [applyReadState, enabled])

  useEffect(() => {
    if (!enabled) return

    readStateRef.current = loadReadStateFromStorage()
    void refreshNotifications()

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
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearInterval(intervalId)
    }
  }, [enabled, refreshNotifications])

  const markConversationSeen = useCallback(
    async (
      recordKind: PortalRecordKind,
      recordId: number,
      lastSeenMessageId: number
    ) => {
      if (!enabled) return

      const key = chatterReadStateKey(recordKind, recordId)
      const matchingUnread = unreadRef.current.find(
        (item) => item.recordKind === recordKind && item.recordId === recordId
      )
      const effectiveLastSeen = Math.max(
        lastSeenMessageId,
        matchingUnread?.latestMessageId ?? 0
      )

      const current = readStateRef.current[key] ?? 0
      if (effectiveLastSeen <= current) {
        setUnread((items) => {
          const hasUnread = items.some(
            (item) => item.recordKind === recordKind && item.recordId === recordId
          )
          if (!hasUnread) return items
          return items.filter(
            (item) =>
              !(item.recordKind === recordKind && item.recordId === recordId)
          )
        })
        return
      }

      if (markingRef.current.has(key)) return
      markingRef.current.add(key)

      queueMicrotask(() => {
        setUnread((items) => {
          const hasUnread = items.some(
            (item) => item.recordKind === recordKind && item.recordId === recordId
          )
          if (!hasUnread) return items
          return items.filter(
            (item) =>
              !(item.recordKind === recordKind && item.recordId === recordId)
          )
        })
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

  const clearPendingNavigation = useCallback(() => {
    setPendingNavigation(null)
  }, [])

  useEffect(() => {
    if (!pendingNavigation) return

    const timeoutId = window.setTimeout(() => {
      setPendingNavigation(null)
    }, PENDING_NAVIGATION_TIMEOUT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [pendingNavigation])

  const openNotification = useCallback(
    (notification: ChatterUnreadNotification) => {
      setPendingNavigation({
        listKind: notification.listKind,
        recordId: notification.recordId,
        name: notification.name,
      })

      const openParam = openParamFromListKind(
        notification.listKind,
        notification.recordId
      )
      router.push(`/tramites?open=${encodeURIComponent(openParam)}&tab=conversation`)
    },
    [router]
  )

  const isUnread = useCallback(
    (recordKind: PortalRecordKind, recordId: number) =>
      unread.some(
        (item) => item.recordKind === recordKind && item.recordId === recordId
      ),
    [unread]
  )

  const value = useMemo(
    () => ({
      unread,
      unreadCount: unread.length,
      pendingNavigation,
      isUnread,
      markConversationSeen,
      openNotification,
      clearPendingNavigation,
      refreshNotifications,
    }),
    [
      unread,
      pendingNavigation,
      isUnread,
      markConversationSeen,
      openNotification,
      clearPendingNavigation,
      refreshNotifications,
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
