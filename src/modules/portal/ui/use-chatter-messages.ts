import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { portalChatter } from '@/content/portal-chatter'
import {
  fetchNewerRecordMessages,
  fetchOlderRecordMessages,
} from '@/src/modules/portal/ui/portal-read-api'
import {
  drawerBundleKey,
  isDrawerBundleFresh,
  loadDrawerBundle,
  readDrawerBundle,
  touchDrawerBundle,
  writeDrawerMessages,
} from '@/src/modules/portal/ui/record-drawer-bundle'
import {
  BEHIND_KNOWN_MAX_WAIT_MS,
  isChatBehindKnownMessage,
  waitAtMost,
} from '@/src/modules/portal/domain/chat-behind-known-message'
import { enrichPortalChatterMessages } from '@/src/modules/portal/domain/enrich-portal-chatter-messages'
import {
  countAttachmentsInNewMessages,
  mergeChatterMessages,
} from '@/src/modules/portal/domain/merge-chatter-messages'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import type { usePortalNotificationsOptional } from '@/src/modules/portal/ui/portal-notifications-context'

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
  /** Llegan mensajes nuevos con adjuntos (p. ej. subidos desde Odoo): cuántos, para el contador de documentos. */
  onIncomingAttachments?: (count: number) => void
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
  onIncomingAttachments,
  notifications,
  scrollRef,
  shouldStickToBottomRef,
  resetComposerState,
}: UseChatterMessagesArgs) {
  // Al volver a montarse (p. ej. al regresar de la pestaña de documentos) arranca ya con lo guardado:
  // sin esto, el primer pintado enseñaba «no hay mensajes» hasta que corría el efecto de carga.
  const [initialCached] = useState(() => (recordId > 0 ? readDrawerBundle(kind, recordId) : undefined))
  const [messages, setMessages] = useState<PortalChatterMessage[]>(() =>
    initialCached ? enrichPortalChatterMessages(initialCached.messages) : []
  )
  // De qué registro son `messages` (se fija en el mismo lote que ellos). Mientras no coincida con
  // el registro actual no se guarda nada en la caché: antes de cargar, `messages` es `[]` o de otro.
  const [loadedKey, setLoadedKey] = useState<string | null>(() =>
    initialCached ? drawerBundleKey(kind, recordId) : null
  )
  const [hasMore, setHasMore] = useState(initialCached?.hasMore ?? false)
  // Sin nada guardado, arranca ya en «cargando»: así el primer pintado es el esqueleto y no el
  // aviso de «no hay mensajes», que parpadeaba hasta que corría el efecto de carga.
  // También arranca en «cargando» si lo guardado va por detrás del mensaje del aviso que se acaba
  // de abrir: enseñar la copia vieja y colar el mensaje nuevo 1-2 s después se ve como un salto.
  const [loadingInitial, setLoadingInitial] = useState(
    () =>
      active &&
      recordId > 0 &&
      (!initialCached || isChatBehindKnownMessage(initialCached.messages, latestKnownMessageId))
  )
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadingNewer, setLoadingNewer] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dividerDismissed, setDividerDismissed] = useState(false)

  // Lo último pintado y el aviso de adjuntos, por ref: `loadNewer` no debe cambiar con ellos.
  const messagesRef = useRef(messages)
  const onIncomingAttachmentsRef = useRef(onIncomingAttachments)
  useEffect(() => {
    messagesRef.current = messages
    onIncomingAttachmentsRef.current = onIncomingAttachments
  })

  const loadGenerationRef = useRef(0)
  const loadingOlderRef = useRef(false)
  const loadingNewerRef = useRef(false)
  const lastNotifiedMessageIdRef = useRef(0)
  // Último id que ha devuelto el servidor. Un mensaje propio recién enviado puede tener un id mayor
  // que uno anterior de otra persona que aún no se ha cargado: pedir «lo posterior» desde el propio
  // dejaría ese hueco para siempre, así que lo nuevo se pide siempre desde el último id del servidor.
  const lastServerIdRef = useRef(0)
  const onConversationViewedRef = useRef(onConversationViewed)
  // Por ref: `loadInitial` no puede depender de él (cambia con cada sondeo y recargaría el chat).
  const latestKnownMessageIdRef = useRef(latestKnownMessageId)

  useEffect(() => {
    onConversationViewedRef.current = onConversationViewed
  }, [onConversationViewed])

  useEffect(() => {
    latestKnownMessageIdRef.current = latestKnownMessageId
  }, [latestKnownMessageId])

  useEffect(() => {
    lastNotifiedMessageIdRef.current = 0
    lastServerIdRef.current = 0
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

  /**
   * Pide solo lo posterior a `afterId` y lo añade. Con `silent` no enciende el indicador de
   * «escribiendo»: es una comprobación de rutina al reabrir un chat guardado, no la señal de que
   * está llegando un mensaje (eso lo da el sondeo de novedades).
   */
  const loadNewer = useCallback(
    async (afterId: number, options: { silent?: boolean } = {}) => {
      if (loadingNewerRef.current) return
      loadingNewerRef.current = true
      if (!options.silent) setLoadingNewer(true)
      try {
        const result = await fetchNewerRecordMessages(kind, recordId, afterId)
        if (!result.ok) return
        if (!result.messages.length) {
          touchDrawerBundle(kind, recordId)
          return
        }
        lastServerIdRef.current = Math.max(
          lastServerIdRef.current,
          ...result.messages.map((message) => message.id)
        )
        const newAttachments = countAttachmentsInNewMessages(
          result.messages,
          new Set(messagesRef.current.map((message) => message.id))
        )
        if (newAttachments > 0) onIncomingAttachmentsRef.current?.(newAttachments)
        setMessages((current) => {
          const merged = mergeChatterMessages(current, result.messages)
          return merged === current ? current : enrichPortalChatterMessages(merged)
        })
      } finally {
        loadingNewerRef.current = false
        if (!options.silent) setLoadingNewer(false)
      }
    },
    [kind, recordId]
  )

  const loadInitial = useCallback(async () => {
    if (recordId <= 0) return

    const generation = ++loadGenerationRef.current
    setError(null)
    setDividerDismissed(false)
    resetComposerState()
    shouldStickToBottomRef.current = true

    // Conversación ya vista: se pinta al instante y, si lleva un rato guardada, se pide solo lo
    // posterior al último mensaje (el sondeo de novedades ya avisa de lo que llegue después).
    const cached = readDrawerBundle(kind, recordId)
    if (cached) {
      const enriched = enrichPortalChatterMessages(cached.messages)
      const lastId = enriched[enriched.length - 1]?.id
      setMessages(enriched)
      setHasMore(cached.hasMore)
      setLoadedKey(drawerBundleKey(kind, recordId))
      lastServerIdRef.current = lastId ?? 0

      // Se abrió un aviso de un mensaje que la copia guardada aún no tiene: el esqueleto espera
      // (como mucho unos segundos) a pedir lo posterior, y el «visto» lo da el efecto de más abajo
      // cuando ya está pintado.
      if (lastId && isChatBehindKnownMessage(enriched, latestKnownMessageIdRef.current)) {
        setLoadingInitial(true)
        await waitAtMost(loadNewer(lastId, { silent: true }), BEHIND_KNOWN_MAX_WAIT_MS)
        if (generation === loadGenerationRef.current) setLoadingInitial(false)
        return
      }

      setLoadingInitial(false)
      notifyConversationViewed(enriched)
      if (!isDrawerBundleFresh(cached) && lastId) void loadNewer(lastId, { silent: true }).catch(() => {})
      return
    }

    setLoadingInitial(true)
    setMessages([])
    setHasMore(false)

    try {
      const result = await loadDrawerBundle(kind, recordId)
      if (generation !== loadGenerationRef.current) return

      if (!result.ok) {
        setError(
          portalChatter.errors[result.error] ?? portalChatter.errors.odoo_unavailable
        )
        return
      }

      const enriched = enrichPortalChatterMessages(result.messages)
      lastServerIdRef.current = enriched[enriched.length - 1]?.id ?? 0
      setMessages(enriched)
      setHasMore(result.hasMore)
      setLoadedKey(drawerBundleKey(kind, recordId))
      notifyConversationViewed(enriched)
    } catch {
      if (generation !== loadGenerationRef.current) return
      setError(portalChatter.errors.odoo_unavailable)
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoadingInitial(false)
      }
    }
  }, [kind, recordId, loadNewer, notifyConversationViewed, resetComposerState, shouldStickToBottomRef])

  useEffect(() => {
    if (!active || recordId <= 0) return
    // Dispara la carga inicial del chatter (fetch-on-mount/active).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInitial()
  }, [active, recordId, loadInitial])

  // Guarda la conversación de este registro cada vez que cambia (llegan, se envían o se cargan
  // más antiguos), para reabrirla al instante.
  useEffect(() => {
    if (loadingInitial || loadedKey !== drawerBundleKey(kind, recordId)) return
    writeDrawerMessages(kind, recordId, { messages, hasMore })
  }, [hasMore, kind, loadedKey, loadingInitial, messages, recordId])

  useEffect(() => {
    if (!active || loadingInitial || recordId <= 0) return
    if (!latestKnownMessageId || loadingNewerRef.current) return

    const maxLoadedId = messages.length ? messages[messages.length - 1]!.id : 0
    if (latestKnownMessageId <= maxLoadedId) return

    // Dispara el fetch de mensajes más recientes (polling) — no derivable.
    void loadNewer(lastServerIdRef.current || maxLoadedId).catch(() => {})
  }, [active, latestKnownMessageId, loadNewer, loadingInitial, messages, recordId])

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
      const merged = mergeChatterMessages(current, [broadcast.message])
      return merged === current ? current : enrichPortalChatterMessages(merged)
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

  /**
   * Tras enviar un mensaje propio: pide lo que otra persona haya escrito entre lo último cargado
   * y el mensaje enviado (su id es mayor, pero el hueco quedaría sin cargar).
   */
  const syncAfterOwnMessage = useCallback(async () => {
    const afterId = lastServerIdRef.current
    if (!afterId) return
    await loadNewer(afterId, { silent: true })
  }, [loadNewer])

  const loadOlder = useCallback(async () => {
    if (recordId <= 0 || loadingOlderRef.current || !hasMore || !messages.length) {
      return
    }

    loadingOlderRef.current = true
    setLoadingOlder(true)
    setError(null)

    const scrollNode = scrollRef.current
    const previousHeight = scrollNode?.scrollHeight ?? 0

    const result = await fetchOlderRecordMessages(kind, recordId, messages[0]?.id)

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
    syncAfterOwnMessage,
  }
}
