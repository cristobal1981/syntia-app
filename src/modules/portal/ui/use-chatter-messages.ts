import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { portalChatter } from '@/content/portal-chatter'
import {
  listNewerRecordMessagesAction,
  listRecordMessagesAction,
} from '@/src/modules/portal/application/portal-chatter-actions'
import { enrichPortalChatterMessages } from '@/src/modules/portal/domain/enrich-portal-chatter-messages'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import { isPortalChatterMockEnabled } from '@/src/modules/portal/lib/portal-chatter-mock'
import { CHATTER_MOCK_MESSAGES } from '@/src/modules/portal/ui/chatter-mock-data'
import type { usePortalNotificationsOptional } from '@/src/modules/portal/ui/portal-notifications-context'

export const chatterMockEnabled = isPortalChatterMockEnabled()

function recordScopeFromKind(kind: PortalRecordKind): 'tramite' | 'consulta' {
  return kind === 'task' ? 'tramite' : 'consulta'
}

type UseChatterMessagesArgs = {
  kind: PortalRecordKind
  recordId: number
  active: boolean
  markReadOnView: boolean
  onConversationViewed?: (latestMessageId: number) => void
  lastSeenMessageIdBeforeOpen: number
  latestKnownMessageId?: number
  notifications: ReturnType<typeof usePortalNotificationsOptional>
  scrollRef: RefObject<HTMLDivElement | null>
  shouldStickToBottomRef: RefObject<boolean>
  resetComposerState: () => void
}

/**
 * Posesión exclusiva de la carga/paginación de mensajes del chatter (inicial,
 * "más antiguos" al hacer scroll arriba, "más nuevos" cuando el poll de
 * notificaciones detecta algo por delante de lo cargado, y el mensaje propio
 * que llega por `BroadcastChannel` desde otra pestaña) y del tracking de
 * "visto" — separado de scroll/composer/envío, que siguen en
 * `RecordChatterPanel` por lo entrelazados que están con el DOM.
 */
export function useChatterMessages({
  kind,
  recordId,
  active,
  markReadOnView,
  onConversationViewed,
  lastSeenMessageIdBeforeOpen,
  latestKnownMessageId,
  notifications,
  scrollRef,
  shouldStickToBottomRef,
  resetComposerState,
}: UseChatterMessagesArgs) {
  const [messages, setMessages] = useState<PortalChatterMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadingNewer, setLoadingNewer] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dividerDismissed, setDividerDismissed] = useState(false)

  const loadGenerationRef = useRef(0)
  const loadingOlderRef = useRef(false)
  const loadingNewerRef = useRef(false)
  const lastNotifiedMessageIdRef = useRef(0)
  const onConversationViewedRef = useRef(onConversationViewed)

  useEffect(() => {
    onConversationViewedRef.current = onConversationViewed
  }, [onConversationViewed])

  useEffect(() => {
    lastNotifiedMessageIdRef.current = 0
  }, [kind, recordId])

  const notifyConversationViewed = useCallback(
    (nextMessages: PortalChatterMessage[]) => {
      if (!markReadOnView || !nextMessages.length) return
      const latestId = nextMessages[nextMessages.length - 1]?.id
      if (!latestId || latestId <= lastNotifiedMessageIdRef.current) return
      lastNotifiedMessageIdRef.current = latestId
      queueMicrotask(() => {
        onConversationViewedRef.current?.(latestId)
      })
    },
    [markReadOnView]
  )

  const loadInitial = useCallback(async () => {
    if (recordId <= 0) return

    const generation = ++loadGenerationRef.current

    setLoadingInitial(true)
    setError(null)
    setMessages([])
    setHasMore(false)
    setDividerDismissed(false)
    resetComposerState()
    shouldStickToBottomRef.current = true

    try {
      if (chatterMockEnabled) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        if (generation !== loadGenerationRef.current) return
        const mockMessages = enrichPortalChatterMessages([...CHATTER_MOCK_MESSAGES])
        setMessages(mockMessages)
        setHasMore(false)
        notifyConversationViewed(mockMessages)
        return
      }

      const result = await listRecordMessagesAction({ kind, recordId })
      if (generation !== loadGenerationRef.current) return

      if (!result.ok) {
        setError(
          portalChatter.errors[result.error] ?? portalChatter.errors.odoo_unavailable
        )
        return
      }

      const enriched = enrichPortalChatterMessages(result.messages)
      setMessages(enriched)
      setHasMore(result.hasMore)
      notifyConversationViewed(enriched)
    } catch {
      if (generation !== loadGenerationRef.current) return
      setError(portalChatter.errors.odoo_unavailable)
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoadingInitial(false)
      }
    }
  }, [kind, recordId, notifyConversationViewed, resetComposerState, shouldStickToBottomRef])

  useEffect(() => {
    if (!active || recordId <= 0) return
    // Dispara la carga inicial del chatter (fetch-on-mount/active).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInitial()
  }, [active, recordId, loadInitial])

  useEffect(() => {
    if (chatterMockEnabled || !active || loadingInitial || recordId <= 0) return
    if (!latestKnownMessageId || loadingNewerRef.current) return

    const maxLoadedId = messages.length ? messages[messages.length - 1]!.id : 0
    if (latestKnownMessageId <= maxLoadedId) return

    loadingNewerRef.current = true
    // Dispara el fetch de mensajes más recientes (polling) — no derivable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingNewer(true)
    void listNewerRecordMessagesAction({ kind, recordId, afterId: maxLoadedId })
      .then((result) => {
        if (!result.ok || !result.messages.length) return
        setMessages((current) => {
          const existingIds = new Set(current.map((message) => message.id))
          const newer = result.messages.filter((message) => !existingIds.has(message.id))
          if (!newer.length) return current
          return enrichPortalChatterMessages([...current, ...newer])
        })
      })
      .finally(() => {
        loadingNewerRef.current = false
        setLoadingNewer(false)
      })
  }, [active, kind, latestKnownMessageId, loadingInitial, messages, recordId])

  // Mensaje propio enviado desde OTRA pestaña del mismo usuario: ya llega
  // completo por el broadcast (notifyRecordMutated), no hace falta pedir
  // nada a Odoo para pintarlo aquí.
  useEffect(() => {
    const broadcast = notifications?.lastRecordMessage
    if (!broadcast) return
    if (
      broadcast.scope !== recordScopeFromKind(kind) ||
      broadcast.recordId !== recordId
    ) {
      return
    }

    // Reacciona a un broadcast entre pestañas (BroadcastChannel) — sistema
    // externo real, no una simple derivación de render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages((current) => {
      if (current.some((message) => message.id === broadcast.message.id)) {
        return current
      }
      return enrichPortalChatterMessages([...current, broadcast.message])
    })
  }, [kind, notifications?.lastRecordMessage, recordId])

  // Solo se marca frontera si hay mensajes leídos Y no leídos a la vez —
  // si todo es nuevo (primera visita) o nada lo es, un separador no aporta
  // nada y solo añade ruido.
  const firstUnreadIndex = useMemo(() => {
    if (!lastSeenMessageIdBeforeOpen || dividerDismissed) return -1
    const index = messages.findIndex(
      (message) => message.id > lastSeenMessageIdBeforeOpen
    )
    return index > 0 ? index : -1
  }, [messages, lastSeenMessageIdBeforeOpen, dividerDismissed])

  useEffect(() => {
    if (!active || loadingInitial || !markReadOnView || !messages.length) return
    notifyConversationViewed(messages)
    // Depende de `messages.length`, no de `messages`: solo debe reavisar cuando
    // cambia la CANTIDAD de mensajes, no cuando el array se reemplaza por
    // identidad (enriquecido) con el mismo contenido — evitar el aviso
    // duplicado importa aquí (coste de Odoo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, loadingInitial, markReadOnView, messages.length, notifyConversationViewed])

  const loadOlder = useCallback(async () => {
    if (recordId <= 0 || loadingOlderRef.current || !hasMore || !messages.length) {
      return
    }

    if (chatterMockEnabled) return

    loadingOlderRef.current = true
    setLoadingOlder(true)
    setError(null)

    const scrollNode = scrollRef.current
    const previousHeight = scrollNode?.scrollHeight ?? 0

    const result = await listRecordMessagesAction({
      kind,
      recordId,
      beforeId: messages[0]?.id,
    })

    loadingOlderRef.current = false
    setLoadingOlder(false)

    if (!result.ok) {
      setError(
        portalChatter.errors[result.error] ?? portalChatter.errors.odoo_unavailable
      )
      return
    }

    if (!result.messages.length) {
      setHasMore(false)
      return
    }

    shouldStickToBottomRef.current = false
    setMessages((current) => {
      const existingIds = new Set(current.map((message) => message.id))
      const older = result.messages.filter((message) => !existingIds.has(message.id))
      return enrichPortalChatterMessages([...older, ...current])
    })
    setHasMore(result.hasMore)

    requestAnimationFrame(() => {
      const node = scrollRef.current
      if (!node) return
      const nextHeight = node.scrollHeight
      node.scrollTop += nextHeight - previousHeight
    })
  }, [hasMore, kind, messages, recordId, scrollRef, shouldStickToBottomRef])

  return {
    messages,
    setMessages,
    hasMore,
    loadingInitial,
    loadingOlder,
    loadingNewer,
    error,
    firstUnreadIndex,
    dividerDismissed,
    setDividerDismissed,
    loadOlder,
  }
}
