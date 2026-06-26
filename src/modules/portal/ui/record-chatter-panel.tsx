'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import { Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portalChatter } from '@/content/portal-chatter'
import {
  listRecordMessagesAction,
  postRecordMessageAction,
} from '@/src/modules/portal/application/portal-chatter-actions'
import { prepareChatterHtmlForDisplay } from '@/src/modules/portal/ui/sanitize-chatter-html.client'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import {
  ChatterComposer,
  type ChatterComposerHandle,
} from '@/src/modules/portal/ui/chatter-composer'
import {
  ChatterComposerSkeleton,
  ChatterSkeleton,
} from '@/src/modules/portal/ui/chatter-skeleton'
import { cn } from '@/lib/utils'

type RecordChatterPanelProps = {
  kind: PortalRecordKind
  recordId: number
  active: boolean
  canReply: boolean
  scrollPin?: number
  markReadOnView?: boolean
  onConversationViewed?: (latestMessageId: number) => void
}

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
  scrollPin = 0,
  markReadOnView = false,
  onConversationViewed,
}: RecordChatterPanelProps) {
  const [messages, setMessages] = useState<PortalChatterMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [composerEmpty, setComposerEmpty] = useState(true)
  const [composerResetToken, setComposerResetToken] = useState(0)
  const [pending, startTransition] = useTransition()

  const scrollRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<ChatterComposerHandle>(null)
  const shouldStickToBottomRef = useRef(true)
  const loadingOlderRef = useRef(false)
  const lastNotifiedMessageIdRef = useRef(0)
  const onConversationViewedRef = useRef(onConversationViewed)

  useEffect(() => {
    onConversationViewedRef.current = onConversationViewed
  }, [onConversationViewed])

  useEffect(() => {
    lastNotifiedMessageIdRef.current = 0
  }, [kind, recordId])

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
    if (!shouldStickToBottomRef.current && composerEmpty) return
    scrollToBottom()
  }, [composerEmpty, scrollToBottom])

  const loadInitial = useCallback(async () => {
    if (recordId <= 0) return

    setLoadingInitial(true)
    setError(null)
    setMessages([])
    setHasMore(false)
    setSendError(null)
    setComposerEmpty(true)
    setComposerResetToken((token) => token + 1)
    shouldStickToBottomRef.current = true

    const result = await listRecordMessagesAction({ kind, recordId })
    setLoadingInitial(false)

    if (!result.ok) {
      setError(
        portalChatter.errors[result.error] ?? portalChatter.errors.odoo_unavailable
      )
      return
    }

    setMessages(result.messages)
    setHasMore(result.hasMore)
    notifyConversationViewed(result.messages)
  }, [kind, recordId, notifyConversationViewed])

  useEffect(() => {
    if (!active || recordId <= 0) return
    void loadInitial()
  }, [active, recordId, loadInitial])

  useEffect(() => {
    if (!active || loadingInitial || !markReadOnView || !messages.length) return
    notifyConversationViewed(messages)
  }, [active, loadingInitial, markReadOnView, messages.length, notifyConversationViewed])

  useLayoutEffect(() => {
    if (!active || loadingInitial) return
    if (shouldStickToBottomRef.current) {
      scrollToBottom()
    }
  }, [active, loadingInitial, messages, scrollToBottom])

  useLayoutEffect(() => {
    if (!active || loadingInitial || scrollPin <= 0) return
    shouldStickToBottomRef.current = true
    scrollToBottom()
  }, [active, loadingInitial, scrollPin, scrollToBottom])

  const loadOlder = useCallback(async () => {
    if (recordId <= 0 || loadingOlderRef.current || !hasMore || !messages.length) {
      return
    }

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
      return [...older, ...current]
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canReply || composerEmpty || recordId <= 0) return

    const htmlBody = composerRef.current?.getHtml() ?? ''
    if (composerRef.current?.isEmpty()) return

    setSendError(null)
    startTransition(async () => {
      const result = await postRecordMessageAction({
        kind,
        recordId,
        body: htmlBody,
      })

      if (!result.ok) {
        setSendError(
          portalChatter.errors[result.error] ?? portalChatter.errors.odoo_unavailable
        )
        return
      }

      composerRef.current?.clear()
      shouldStickToBottomRef.current = true
      setMessages((current) => {
        if (current.some((message) => message.id === result.message.id)) {
          return current
        }
        return [...current, result.message]
      })
    })
  }

  return (
    <section
      aria-labelledby="record-chatter-heading"
      className="flex min-h-0 flex-1 flex-col"
    >
      <h3 id="record-chatter-heading" className="sr-only">
        {portalChatter.title}
      </h3>

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
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  'flex',
                  message.isFromClient ? 'justify-end' : 'justify-start'
                )}
              >
                <article
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3 py-2 text-sm',
                    message.isFromClient
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md border border-border bg-muted/50 text-foreground dark:border-border'
                  )}
                >
                  <header className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-semibold">
                      {message.isFromClient
                        ? portalChatter.youLabel
                        : message.authorName}
                    </span>
                    <time
                      className={cn(
                        'text-[11px]',
                        message.isFromClient
                          ? 'text-primary-foreground/80'
                          : 'text-subtle-foreground'
                      )}
                      dateTime={message.date}
                    >
                      {formatMessageDate(message.date)}
                    </time>
                  </header>
                  <div
                    className={cn(
                      'break-words [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:m-0 [&_p+p]:mt-2 [&_s]:line-through [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5',
                      message.isFromClient && '[&_a]:text-primary-foreground'
                    )}
                    dangerouslySetInnerHTML={{
                      __html: prepareChatterHtmlForDisplay(message.bodyHtml),
                    }}
                  />
                </article>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border px-6 py-4 dark:border-border">
        {!canReply ? (
          <p className="text-sm text-muted-foreground">
            {portalChatter.readOnlyClosedTicket}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              {loadingInitial ? (
                <ChatterComposerSkeleton />
              ) : (
                <ChatterComposer
                  ref={composerRef}
                  disabled={pending}
                  resetToken={composerResetToken}
                  onEmptyChange={handleComposerEmptyChange}
                  onResize={handleComposerResize}
                />
              )}
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0 rounded-full"
                disabled={pending || composerEmpty || loadingInitial}
                aria-label={pending ? portalChatter.sending : portalChatter.sendButton}
              >
                {pending ? (
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
              </Button>
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
