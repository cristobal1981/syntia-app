import { CornerDownLeft } from 'lucide-react'

import { portalChatter } from '@/content/portal-chatter'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import { normalizeChatterDisplaySnippet } from '@/src/modules/portal/domain/normalize-chatter-display-body'
import { ChatterAuthorAvatar } from '@/src/modules/portal/ui/chatter-author-avatar'
import { ChatterAttachmentChip } from '@/src/modules/portal/ui/chatter-attachment-chip'
import { ChatterQuotedPreview } from '@/src/modules/portal/ui/chatter-quoted-preview'
import { prepareChatterHtmlForDisplay } from '@/src/modules/portal/ui/sanitize-chatter-html.client'
import { Button } from '@/components/ui/button'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { cn } from '@/lib/utils'

type ChatterMessageItemProps = {
  message: PortalChatterMessage
  canReply: boolean
  formatDate: (value: string) => string
  onReply?: (message: PortalChatterMessage) => void
  onOpenDocument?: (attachmentId: number) => void
}

function ChatterReplyButton({
  message,
  onReply,
}: {
  message: PortalChatterMessage
  onReply: (message: PortalChatterMessage) => void
}) {
  return (
    <PortalActionTooltip content={portalChatter.replyAction}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 cursor-pointer text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-foreground"
        onClick={() => onReply(message)}
        aria-label={portalChatter.replyAction}
      >
        <CornerDownLeft className="size-3.5" aria-hidden />
      </Button>
    </PortalActionTooltip>
  )
}

export function ChatterMessageItem({
  message,
  canReply,
  formatDate,
  onReply,
  onOpenDocument,
}: ChatterMessageItemProps) {
  const variant = message.isFromClient ? 'client' : 'advisor'
  const showReply = canReply && Boolean(onReply)

  return (
    <li
      className={cn(
        'group flex items-end gap-1.5',
        message.isFromClient ? 'justify-end' : 'justify-start'
      )}
    >
      {!message.isFromClient && message.authorPartnerId ? (
        <ChatterAuthorAvatar
          name={message.authorName}
          partnerId={message.authorPartnerId}
        />
      ) : null}

      {showReply && message.isFromClient ? (
        <ChatterReplyButton message={message} onReply={onReply!} />
      ) : null}

      <article
        className={cn(
          'max-w-[88%] rounded-2xl px-3 py-2 text-sm',
          message.isFromClient
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md border border-border bg-muted/50 text-foreground dark:chatter-advisor-bubble'
        )}
      >
        <header className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-semibold">
            {message.isFromClient ? portalChatter.youLabel : message.authorName}
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
            {formatDate(message.date)}
          </time>
        </header>

        {message.parentPreview ? (
          <div className="mb-2">
            <ChatterQuotedPreview
              authorName={message.parentPreview.authorName}
              snippet={message.parentPreview.snippet}
              variant={variant}
            />
          </div>
        ) : null}

        {message.bodyHtml ? (
          <div
            className={cn(
              'break-words [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:m-0 [&_p+p]:mt-2 [&_s]:line-through [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5',
              message.isFromClient && '[&_a]:text-primary-foreground'
            )}
            dangerouslySetInnerHTML={{
              __html: prepareChatterHtmlForDisplay(message.bodyHtml),
            }}
          />
        ) : null}

        {message.attachments?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="sr-only">{portalChatter.attachmentsLabel}</span>
            {message.attachments.map((attachment) => (
              <ChatterAttachmentChip
                key={attachment.id}
                name={attachment.name}
                variant={variant}
                onClick={
                  onOpenDocument
                    ? () => onOpenDocument(attachment.id)
                    : undefined
                }
              />
            ))}
          </div>
        ) : null}
      </article>

      {showReply && !message.isFromClient ? (
        <ChatterReplyButton message={message} onReply={onReply!} />
      ) : null}
    </li>
  )
}

export function buildParentPreview(message: PortalChatterMessage) {
  return {
    authorName: message.isFromClient ? portalChatter.youLabel : message.authorName,
    snippet: normalizeChatterDisplaySnippet(message.bodyHtml),
  }
}
