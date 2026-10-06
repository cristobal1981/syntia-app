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
import { usePathname, useRouter } from 'next/navigation'

import {
  notificationMatchesTramiteRecord,
  pruneResolvedFirmaNotifications,
} from '@/src/modules/portal/domain/compute-portal-notifications'
import type {
  ChatterReadStateMap,
  PortalNotification,
  PortalNotificationReason,
  PortalNotificationsStats,
} from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import { useChatterReadState } from '@/src/modules/portal/ui/use-chatter-read-state'
import { usePortalNotificationActions } from '@/src/modules/portal/ui/use-portal-notification-actions'
import { usePortalNotificationsSync } from '@/src/modules/portal/ui/use-portal-notifications-sync'
import { usePortalPageRefresh } from '@/src/modules/portal/ui/use-portal-page-refresh'

type PortalNotificationsContextValue = {
  unread: PortalNotification[]
  unreadCount: number
  notificationsLoading: boolean
  stats: PortalNotificationsStats | null
  /**
   * Último mensaje de chat que ESTA pestaña recibió de una pestaña hermana
   * (broadcast de notifyRecordMutated con `message`). Un chat abierto para
   * ese mismo scope/recordId debe pintarlo directamente, sin pedir nada a
   * Odoo — ya viene completo desde la pestaña que lo envió.
   */
  lastRecordMessage: {
    scope: 'tramite' | 'consulta' | 'obligacion'
    recordId: number
    message: PortalChatterMessage
  } | null
  hasUnreadChatter: (recordKind: PortalRecordKind, recordId: number) => boolean
  getLastSeenMessageId: (recordKind: PortalRecordKind, recordId: number) => number
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
  /**
   * Avisa a las demás pestañas de que ESTA pestaña acaba de modificar un
   * registro (subida propia, mensaje propio) para que refresquen sus datos.
   * Los cambios detectados en Odoo por terceros ya llegan vía poll; esto
   * cubre el caso de la propia acción del usuario en otra pestaña.
   */
  notifyRecordMutated: (
    scope: 'tramite' | 'consulta' | 'obligacion',
    recordId: number,
    message?: PortalChatterMessage
  ) => void
  openNotification: (notification: PortalNotification) => void
  refreshNotifications: () => Promise<void>
  initializeNotifications: (payload: {
    unread: PortalNotification[]
    readState: ChatterReadStateMap
    stats?: PortalNotificationsStats
  }) => void
}

const PortalNotificationsContext =
  createContext<PortalNotificationsContextValue | null>(null)

type PortalNotificationsProviderProps = {
  children: ReactNode
  enabled: boolean
}

export function PortalNotificationsProvider({
  children,
  enabled,
}: PortalNotificationsProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [unread, setUnread] = useState<PortalNotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(enabled)
  const [stats, setStats] = useState<PortalNotificationsStats | null>(null)
  const [lastRecordMessage, setLastRecordMessage] =
    useState<PortalNotificationsContextValue['lastRecordMessage']>(null)
  const unreadRef = useRef<PortalNotification[]>([])
  const ssrHydratedRef = useRef(false)
  const pendingFirmaIdsRef = useRef<number[]>([])
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  const commitUnread = useCallback((nextUnread: PortalNotification[]) => {
    const pruned = pruneResolvedFirmaNotifications(
      nextUnread,
      pendingFirmaIdsRef.current
    )
    unreadRef.current = pruned
    setUnread(pruned)
    return pruned
  }, [])

  const { refreshPortalPages } = usePortalPageRefresh(router)

  const { readStateRef, applyReadState, hydrateFromStorage, loadFromStorage, getLastSeenMessageId } =
    useChatterReadState(enabled)

  const { refreshNotifications, notifyRecordMutated, publishStateToOtherTabs, resetPollInterval } =
    usePortalNotificationsSync({
      enabled,
      pathnameRef,
      pendingFirmaIdsRef,
      unreadRef,
      readStateRef,
      commitUnread,
      applyReadState,
      loadReadStateFromStorage: loadFromStorage,
      refreshPortalPages,
      setStats,
      setLastRecordMessage,
      setNotificationsLoading,
    })

  const {
    dismissNewTramiteNotification,
    markConversationSeen,
    ackDocumentsSeen,
    ackStatusChangeSeen,
    openNotification,
  } = usePortalNotificationActions({
    enabled,
    router,
    unreadRef,
    readStateRef,
    commitUnread,
    publishStateToOtherTabs,
    applyReadState,
    resetPollInterval,
  })

  const initializeNotifications = useCallback(
    (payload: {
      unread: PortalNotification[]
      readState: ChatterReadStateMap
      stats?: PortalNotificationsStats
    }) => {
      if (ssrHydratedRef.current) return
      ssrHydratedRef.current = true
      hydrateFromStorage(payload.readState)
      commitUnread(payload.unread)
      if (payload.stats) {
        setStats(payload.stats)
      }
      setNotificationsLoading(false)
    },
    [commitUnread, hydrateFromStorage]
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
      stats,
      lastRecordMessage,
      hasUnreadChatter,
      getLastSeenMessageId,
      hasTramiteNotification,
      dismissNewTramiteNotification,
      markConversationSeen,
      ackDocumentsSeen,
      ackStatusChangeSeen,
      notifyRecordMutated,
      openNotification,
      refreshNotifications,
      initializeNotifications,
    }),
    [
      unread,
      notificationsLoading,
      stats,
      lastRecordMessage,
      hasUnreadChatter,
      getLastSeenMessageId,
      hasTramiteNotification,
      dismissNewTramiteNotification,
      markConversationSeen,
      ackDocumentsSeen,
      ackStatusChangeSeen,
      notifyRecordMutated,
      openNotification,
      refreshNotifications,
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
