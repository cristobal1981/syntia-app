'use client'

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { portalChatter } from '@/content/portal-chatter'
import {
  listNewerRecordMessagesAction,
  listRecordMessagesAction,
  postRecordMessageAction,
} from '@/src/modules/portal/application/portal-chatter-actions'
import { enrichPortalChatterMessages } from '@/src/modules/portal/domain/enrich-portal-chatter-messages'
import { isChatterHtmlEmpty } from '@/src/modules/portal/domain/filter-portal-messages'
import type {
  PortalChatterAttachmentRef,
  PortalChatterMessage,
} from '@/src/modules/portal/domain/portal-chatter-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import {
  isAllowedChatterMimeType,
  readFilesAsUploadPayload,
  validatePendingFilesSelection,
} from '@/src/modules/portal/lib/chatter-attachment-validation'
import { isPortalChatterMockEnabled } from '@/src/modules/portal/lib/portal-chatter-mock'
import {
  ChatterComposer,
  type ChatterComposerHandle,
} from '@/src/modules/portal/ui/chatter-composer'
import { ChatterSendButton } from '@/src/modules/portal/ui/chatter-send-button'
import {
  ChatterComposerSkeleton,
  ChatterSkeleton,
} from '@/src/modules/portal/ui/chatter-skeleton'
import {
  buildParentPreview,
  ChatterMessageItem,
} from '@/src/modules/portal/ui/chatter-message-item'
import { ChatterTypingIndicator } from '@/src/modules/portal/ui/chatter-typing-indicator'
import { ChatterPendingAttachments } from '@/src/modules/portal/ui/chatter-pending-attachments'
import { ChatterReplyBanner } from '@/src/modules/portal/ui/chatter-reply-banner'
import {
  CHATTER_MOCK_MESSAGES,
  createMockMessageId,
} from '@/src/modules/portal/ui/chatter-mock-data'
import { invalidateAttachmentsClientCache } from '@/src/modules/portal/ui/record-attachments-panel'
import { usePortalNotificationsOptional } from '@/src/modules/portal/ui/portal-notifications-context'

type RecordChatterPanelProps = {
  kind: PortalRecordKind
  recordId: number
  active: boolean
  canReply: boolean
  notifyPartnerIds?: number[]
  scrollPin?: number
  markReadOnView?: boolean
  onConversationViewed?: (latestMessageId: number) => void
  onOpenAttachment?: (attachment: PortalChatterAttachmentRef) => void
  onAttachmentsChanged?: (attachmentCount: number) => void
  /**
   * Id del último mensaje que el poll de novedades ya sabe que existe para
   * este registro. Cuando sube por encima de lo que este panel tiene
   * cargado, se pide a Odoo solo lo nuevo (no toda la conversación) para
   * reflejarlo sin necesidad de cerrar y reabrir el drawer.
   */
  latestKnownMessageId?: number
  /**
   * Id del último mensaje ya leído justo ANTES de abrir esta vez (0 si no
   * había nada leído todavía). Pinta un separador "Mensajes nuevos" antes
   * del primer mensaje no leído — pero solo si además hay algún mensaje
   * anterior ya leído; si todo es nuevo (o nada lo es), no se pinta nada.
   */
  lastSeenMessageIdBeforeOpen?: number
}

function recordScopeFromKind(kind: PortalRecordKind): 'tramite' | 'consulta' {
  return kind === 'task' ? 'tramite' : 'consulta'
}

const chatterMockEnabled = isPortalChatterMockEnabled()

function formatMessageDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function RecordChatterPanel({
  kind,
  recordId,
  active,
  canReply,
  notifyPartnerIds = [],
  scrollPin = 0,
  markReadOnView = false,
  onConversationViewed,
  onOpenAttachment,
  onAttachmentsChanged,
  latestKnownMessageId,
  lastSeenMessageIdBeforeOpen = 0,
}: RecordChatterPanelProps) {
  const router = useRouter()
  const notifications = usePortalNotificationsOptional()
  const [messages, setMessages] = useState<PortalChatterMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [composerEmpty, setComposerEmpty] = useState(true)
  const [composerResetToken, setComposerResetToken] = useState(0)
  const [replyTarget, setReplyTarget] = useState<PortalChatterMessage | null>(null)
  const replyParentIdRef = useRef<number | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [dividerDismissed, setDividerDismissed] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<ChatterComposerHandle>(null)
  const shouldStickToBottomRef = useRef(true)
  const loadingOlderRef = useRef(false)
  const lastNotifiedMessageIdRef = useRef(0)
  const onConversationViewedRef = useRef(onConversationViewed)
  const loadGenerationRef = useRef(0)

  const canSend = canReply && (!composerEmpty || pendingFiles.length > 0)

  useEffect(() => {
    onConversationViewedRef.current = onConversationViewed
  }, [onConversationViewed])

  useEffect(() => {
    lastNotifiedMessageIdRef.current = 0
  }, [kind, recordId])

  const notifyPartnerIdsRef = useRef(notifyPartnerIds)
  useEffect(() => {
    notifyPartnerIdsRef.current = notifyPartnerIds
  }, [notifyPartnerIds])

  const scrollToBottom = useCallback(() => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [])

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

  const handleComposerEmptyChange = useCallback(
    (empty: boolean) => {
      setComposerEmpty(empty)
      if (!empty) {
        shouldStickToBottomRef.current = true
        scrollToBottom()
      }
    },
    [scrollToBottom]
  )

  const handleComposerResize = useCallback(() => {
    if (!shouldStickToBottomRef.current && composerEmpty && !pendingFiles.length) return
    scrollToBottom()
  }, [composerEmpty, pendingFiles.length, scrollToBottom])

  const clearReplyMode = useCallback(() => {
    replyParentIdRef.current = null
    setReplyTarget(null)
  }, [])

  const resetComposerState = useCallback(() => {
    clearReplyMode()
    setPendingFiles([])
    setComposerEmpty(true)
    setComposerResetToken((token) => token + 1)
    composerRef.current?.clear()
  }, [clearReplyMode])

  const loadInitial = useCallback(async () => {
    if (recordId <= 0) return

    const generation = ++loadGenerationRef.current

    setLoadingInitial(true)
    setError(null)
    setMessages([])
    setHasMore(false)
    setSendError(null)
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
          portalChatter.errors[result.error] ??
            portalChatter.errors.odoo_unavailable
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
  }, [kind, recordId, notifyConversationViewed, resetComposerState])

  useEffect(() => {
    if (!active || recordId <= 0) return
    void loadInitial()
  }, [active, recordId, loadInitial])

  const loadingNewerRef = useRef(false)
  const [loadingNewer, setLoadingNewer] = useState(false)

  useEffect(() => {
    if (chatterMockEnabled || !active || loadingInitial || recordId <= 0) return
    if (!latestKnownMessageId || loadingNewerRef.current) return

    const maxLoadedId = messages.length ? messages[messages.length - 1]!.id : 0
    if (latestKnownMessageId <= maxLoadedId) return

    loadingNewerRef.current = true
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
  }, [active, loadingInitial, markReadOnView, messages.length, notifyConversationViewed])

  useLayoutEffect(() => {
    if (!active || loadingInitial) return
    if (shouldStickToBottomRef.current) {
      scrollToBottom()
    }
  }, [
    active,
    loadingInitial,
    loadingNewer,
    messages,
    pendingFiles.length,
    replyTarget,
    scrollToBottom,
  ])

  useLayoutEffect(() => {
    if (!active || loadingInitial || scrollPin <= 0) return
    shouldStickToBottomRef.current = true
    scrollToBottom()
  }, [active, loadingInitial, scrollPin, scrollToBottom])

  useEffect(() => {
    if (!active || !canReply || loadingInitial || sending) return
    // En táctil, enfocar el editor aquí (navegación pasiva entre récords, no
    // una acción explícita del usuario) abre el teclado y hace saltar la
    // vista en cada flecha ← → de la lista. En "responder" (handleReply) el
    // foco sí es intencional y se mantiene en cualquier dispositivo.
    if (window.matchMedia('(pointer: coarse)').matches) return
    queueMicrotask(() => composerRef.current?.focus())
  }, [active, canReply, loadingInitial, sending, kind, recordId, scrollPin])

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
  }, [hasMore, kind, messages, recordId])

  useEffect(() => {
    const sentinel = topSentinelRef.current
    const root = scrollRef.current
    if (!sentinel || !root || !active) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadOlder()
        }
      },
      { root, rootMargin: '80px 0px 0px 0px', threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [active, loadOlder])

  function handleScroll() {
    const node = scrollRef.current
    if (!node) return
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
    shouldStickToBottomRef.current = distanceFromBottom < 48
  }

  function handleAddFiles(files: File[]) {
    const validation = validatePendingFilesSelection(pendingFiles.length, files.length)
    if (!validation.ok) {
      setSendError(portalChatter.errors[validation.error])
      return
    }

    for (const file of files) {
      if (!isAllowedChatterMimeType(file.type || 'application/octet-stream')) {
        setSendError(portalChatter.errors.invalid_attachment)
        return
      }
    }

    setSendError(null)
    setPendingFiles((current) => [...current, ...files])
    shouldStickToBottomRef.current = true
  }

  function handleRemovePendingFile(index: number) {
    setPendingFiles((current) => current.filter((_, i) => i !== index))
  }

  function handleReply(message: PortalChatterMessage) {
    replyParentIdRef.current = message.id
    setReplyTarget(message)
    setSendError(null)
    shouldStickToBottomRef.current = true
    queueMicrotask(() => composerRef.current?.focus())
  }

  function submitMessage() {
    if (!canSend || recordId <= 0 || sending || loadingInitial) return

    const htmlBody = composerRef.current?.getHtml() ?? ''
    const bodyEmpty = isChatterHtmlEmpty(htmlBody)
    if (bodyEmpty && !pendingFiles.length) return

    setSendError(null)
    const hadAttachments = pendingFiles.length > 0
    const replyParentId = replyParentIdRef.current
    clearReplyMode()
    const filesSnapshot = [...pendingFiles]
    const replyParentMessage = replyParentId
      ? messages.find((message) => message.id === replyParentId)
      : undefined
    const effectiveReplyParentId =
      replyParentId && replyParentMessage ? replyParentId : undefined

    void (async () => {
      setSending(true)
      try {
        if (chatterMockEnabled) {
          await new Promise((resolve) => setTimeout(resolve, 400))
          const newMessage: PortalChatterMessage = {
            id: createMockMessageId(),
            bodyHtml: bodyEmpty ? '' : htmlBody,
            date: new Date().toISOString(),
            authorName: portalChatter.youLabel,
            isFromClient: true,
            ...(effectiveReplyParentId && replyParentMessage
              ? {
                  parentId: effectiveReplyParentId,
                  parentPreview: buildParentPreview(replyParentMessage),
                }
              : {}),
            ...(filesSnapshot.length
              ? {
                  attachments: filesSnapshot.map((file, index) => ({
                    id: -(createMockMessageId() + index),
                    name: file.name,
                  })),
                }
              : {}),
          }
          resetComposerState()
          shouldStickToBottomRef.current = true
          setDividerDismissed(true)
          setMessages((current) => [...current, newMessage])
          return
        }

        const files = filesSnapshot.length
          ? await readFilesAsUploadPayload(filesSnapshot)
          : undefined

        const result = await postRecordMessageAction({
          kind,
          recordId,
          body: bodyEmpty ? '' : htmlBody,
          ...(effectiveReplyParentId ? { parentId: effectiveReplyParentId } : {}),
          files,
          notifyPartnerIds: notifyPartnerIdsRef.current,
        })

        if (!result.ok) {
          setSendError(
            portalChatter.errors[result.error] ?? portalChatter.errors.odoo_unavailable
          )
          return
        }

        resetComposerState()
        shouldStickToBottomRef.current = true
        setDividerDismissed(true)
        const postedMessage = effectiveReplyParentId
          ? result.message
          : (({ parentId: _parentId, parentPreview: _preview, ...message }) => message)(
              result.message
            )
        setMessages((current) => {
          if (current.some((message) => message.id === postedMessage.id)) {
            return current
          }
          return enrichPortalChatterMessages([...current, postedMessage])
        })

        notifications?.notifyRecordMutated(
          recordScopeFromKind(kind),
          recordId,
          postedMessage
        )

        if (hadAttachments && typeof result.attachmentCount === 'number') {
          queueMicrotask(() => {
            invalidateAttachmentsClientCache(kind, recordId)
            onAttachmentsChanged?.(result.attachmentCount!)
            void notifications?.ackDocumentsSeen?.(
              recordScopeFromKind(kind),
              recordId,
              result.attachmentCount!
            )
            router.refresh()
          })
        }
      } finally {
        setSending(false)
      }
    })()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitMessage()
  }

  return (
    <section
      aria-labelledby="record-chatter-heading"
      className="flex min-h-0 flex-1 flex-col"
    >
      <h3 id="record-chatter-heading" className="sr-only">
        {portalChatter.title}
      </h3>

      {chatterMockEnabled ? (
        <p className="border-b border-border bg-muted/30 px-6 py-2 text-xs text-muted-foreground dark:border-border/50">
          {portalChatter.mockBadge}
        </p>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4"
      >
        <div ref={topSentinelRef} className="h-px w-full" aria-hidden />

        {loadingOlder ? (
          <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2
              className="size-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            {portalChatter.loadingOlder}
          </p>
        ) : null}

        {loadingInitial ? (
          <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">{portalChatter.loading}</span>
            <ChatterSkeleton />
          </div>
        ) : null}

        {!loadingInitial && error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {!loadingInitial && !error && !messages.length ? (
          <p className="text-sm text-muted-foreground">{portalChatter.empty}</p>
        ) : null}

        {!loadingInitial && !error && messages.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <Fragment key={message.id}>
                {index === firstUnreadIndex ? (
                  <li className="flex items-center gap-3 py-1" role="separator">
                    <span className="h-px flex-1 bg-primary/30" aria-hidden />
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {portalChatter.newMessagesDivider}
                    </span>
                    <span className="h-px flex-1 bg-primary/30" aria-hidden />
                  </li>
                ) : null}
                <ChatterMessageItem
                  message={message}
                  canReply={canReply}
                  formatDate={formatMessageDate}
                  onReply={handleReply}
                  onOpenAttachment={onOpenAttachment}
                />
              </Fragment>
            ))}
            {loadingNewer ? <ChatterTypingIndicator /> : null}
          </ul>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border px-6 py-4 dark:border-border/50">
        {!canReply ? (
          <p className="text-sm text-muted-foreground">
            {portalChatter.readOnlyClosedTicket}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {replyTarget ? (
              <ChatterReplyBanner
                preview={buildParentPreview(replyTarget)}
                onCancel={clearReplyMode}
              />
            ) : null}
            <ChatterPendingAttachments
              files={pendingFiles}
              disabled={sending}
              onRemove={handleRemovePendingFile}
            />
            <div className="flex items-end gap-2">
              {loadingInitial ? (
                <ChatterComposerSkeleton />
              ) : (
                <ChatterComposer
                  ref={composerRef}
                  disabled={sending}
                  resetToken={composerResetToken}
                  canAttach
                  onAddFiles={handleAddFiles}
                  onEmptyChange={handleComposerEmptyChange}
                  onResize={handleComposerResize}
                  onSubmit={submitMessage}
                />
              )}
              <ChatterSendButton pending={sending} disabled={!canSend || loadingInitial} />
            </div>
            {sendError ? (
              <p className="text-sm text-destructive" role="alert">
                {sendError}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  )
}
