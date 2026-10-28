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
import { openPortalUrl } from '@/src/modules/portal/ui/shallow-url'
import { chatterReadStateKey, openParamFromListKind } from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import {
  dedupedServerAction,
  serverActionDedupKey,
} from '@/src/modules/portal/infrastructure/server-action-dedup'
import { acknowledgeTramiteListItemSeenAction } from '@/src/modules/tramites/application/tramites-list-seen-actions'
import { formatTramiteListItemKey } from '@/src/modules/tramites/domain/merge-tramites-list'
import { dispatchTramitesListItemSeen } from '@/src/modules/tramites/domain/tramites-list-seen-events'

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

  /** Quita el aviso del registro (estado o responsable) de la lista y lo confirma en el servidor. */
  const ackRecordReasonSeen = useCallback(
    async (
      reason: 'status_change' | 'assignee_change',
      scope: 'tramite' | 'consulta' | 'obligacion',
      recordId: number
    ) => {
      if (!enabled) return

      const ackKey = `${scope}:${recordId}:${reason}`
      if (documentsAckInFlightRef.current.has(ackKey)) return
      documentsAckInFlightRef.current.add(ackKey)

      const nextUnread = removePortalNotificationsByScope(
        unreadRef.current,
        scope,
        recordId,
        reason
      )
      commitUnread(nextUnread)
      publishStateToOtherTabs(unreadRef.current)

      resetPollInterval()

      try {
        await dedupedServerAction(
          serverActionDedupKey('ackPortalNotification', { scope, recordId, reason }),
          () => ackPortalNotificationAction({ scope, recordId, reason })
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
    (scope: 'tramite' | 'consulta' | 'obligacion', recordId: number) =>
      ackRecordReasonSeen('status_change', scope, recordId),
    [ackRecordReasonSeen]
  )

  const ackAssigneeChangeSeen = useCallback(
    (scope: 'tramite' | 'consulta' | 'obligacion', recordId: number) =>
      ackRecordReasonSeen('assignee_change', scope, recordId),
    [ackRecordReasonSeen]
  )

  /** Quita la notificación de la lista y, si su motivo se acumula hasta ack, lo confirma en el servidor. */
  const removeAndAckNotification = useCallback(
    (notification: PortalNotification) => {
      const nextUnread = removeNotificationFromList(unreadRef.current, notification)
      commitUnread(nextUnread)
      publishStateToOtherTabs(unreadRef.current)

      if (
        notification.reason === 'status_change' ||
        notification.reason === 'assignee_change' ||
        notification.reason === 'new_firma' ||
        notification.reason === 'firma_due_soon'
      ) {
        void ackPortalNotificationAction({
          scope: notification.scope,
          recordId: notification.recordId,
          reason: notification.reason,
        })
      }
    },
    [commitUnread, publishStateToOtherTabs, unreadRef]
  )

  /**
   * Descarta sin navegar. Los mensajes sin leer y los trámites nuevos se
   * recalculan en cada poll, así que hay que dejar constancia de «visto»
   * (si no, reaparecerían en el siguiente poll).
   */
  const dismissNotification = useCallback(
    (notification: PortalNotification) => {
      if (notification.reason === 'unread_chatter' && notification.recordKind) {
        void markConversationSeen(
          notification.recordKind,
          notification.recordId,
          notification.latestMessageId ?? 0
        )
        return
      }

      if (notification.reason === 'new_tramite' && notification.listKind) {
        const key = formatTramiteListItemKey(notification.listKind, notification.recordId)
        void acknowledgeTramiteListItemSeenAction(key)
        dispatchTramitesListItemSeen(key)
      }

      removeAndAckNotification(notification)
    },
    [markConversationSeen, removeAndAckNotification]
  )

  const dismissAllNotifications = useCallback(() => {
    for (const notification of [...unreadRef.current]) {
      dismissNotification(notification)
    }
  }, [dismissNotification, unreadRef])

  const openNotification = useCallback(
    (notification: PortalNotification) => {
      removeAndAckNotification(notification)

      if (notification.scope === 'firma') {
        router.push('/firmas')
        return
      }

      if (notification.scope === 'obligacion') {
        openPortalUrl(
          router,
          `/obligaciones?open=${encodeURIComponent(`task-${notification.recordId}`)}&tab=documents`
        )
        return
      }

      if (notification.listKind) {
        const openParam = openParamFromListKind(
          notification.listKind,
          notification.recordId
        )
        const url = `/tramites?open=${encodeURIComponent(openParam)}&tab=conversation`
        // Un trámite o consulta NUEVO aún no está en la lista que tiene el navegador: hay que pedir
        // la página. Los avisos de uno que ya existe se abren sin ir al servidor.
        if (notification.reason === 'new_tramite') router.push(url)
        else openPortalUrl(router, url)
      }
    },
    [removeAndAckNotification, router]
  )

  return {
    dismissNewTramiteNotification,
    markConversationSeen,
    ackStatusChangeSeen,
    ackAssigneeChangeSeen,
    openNotification,
    dismissNotification,
    dismissAllNotifications,
  }
}
