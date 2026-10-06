import { useCallback, useRef } from 'react'
import type { useRouter } from 'next/navigation'

import {
  ackPortalNotificationAction,
  markChatterConversationSeenAction,
} from '@/src/modules/portal/application/portal-chatter-notifications-actions'
import {
  notificationMatchesTramiteRecord,
  removeNotificationFromList,
  removePortalNotificationsByRecord,
  removePortalNotificationsByScope,
} from '@/src/modules/portal/domain/compute-portal-notifications'
import type {
  ChatterReadStateMap,
  PortalNotification,
} from '@/src/modules/portal/domain/portal-notifications-types'
import { chatterReadStateKey, openParamFromListKind } from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import {
  dedupedServerAction,
  serverActionDedupKey,
} from '@/src/modules/portal/infrastructure/server-action-dedup'

type UsePortalNotificationActionsArgs = {
  enabled: boolean
  router: ReturnType<typeof useRouter>
  unreadRef: { current: PortalNotification[] }
  readStateRef: { current: ChatterReadStateMap }
  commitUnread: (nextUnread: PortalNotification[]) => PortalNotification[]
  publishStateToOtherTabs: (nextUnread: PortalNotification[]) => void
  applyReadState: (readState: ChatterReadStateMap) => void
  resetPollInterval: () => void
}

/**
 * Las acciones de negocio que un consumidor dispara sobre una notificación
 * ya recibida (marcar conversación vista, confirmar documentos/cambio de
 * estado vistos, descartar, abrir) — separado del polling/sync, que solo
 * produce y propaga el estado que estas acciones leen y mutan.
 */
export function usePortalNotificationActions({
  enabled,
  router,
  unreadRef,
  readStateRef,
  commitUnread,
  publishStateToOtherTabs,
  applyReadState,
  resetPollInterval,
}: UsePortalNotificationActionsArgs) {
  const markingRef = useRef<Set<string>>(new Set())
  const documentsAckInFlightRef = useRef<Set<string>>(new Set())

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
    [commitUnread, publishStateToOtherTabs, unreadRef]
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
    [applyReadState, commitUnread, enabled, publishStateToOtherTabs, readStateRef, unreadRef]
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

      resetPollInterval()

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
    [commitUnread, enabled, publishStateToOtherTabs, resetPollInterval, unreadRef]
  )

  const ackStatusChangeSeen = useCallback(
    async (scope: 'tramite' | 'consulta' | 'obligacion', recordId: number) => {
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

      resetPollInterval()

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
    [commitUnread, enabled, publishStateToOtherTabs, resetPollInterval, unreadRef]
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
        const tab = notification.reason === 'new_document' ? 'documents' : 'documents'
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
        router.push(`/tramites?open=${encodeURIComponent(openParam)}&tab=${tab}`)
      }
    },
    [commitUnread, publishStateToOtherTabs, router, unreadRef]
  )

  return {
    dismissNewTramiteNotification,
    markConversationSeen,
    ackDocumentsSeen,
    ackStatusChangeSeen,
    openNotification,
  }
}
