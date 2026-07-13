import { CornerDownLeft, X } from 'lucide-react'

import { portalChatter } from '@/content/portal-chatter'
import type { PortalChatterParentPreview } from '@/src/modules/portal/domain/portal-chatter-types'
import { ChatterQuotedPreview } from '@/src/modules/portal/ui/chatter-quoted-preview'
import { Button } from '@/components/ui/button'

type ChatterReplyBannerProps = {
  preview: PortalChatterParentPreview
  onCancel: () => void
}

export function ChatterReplyBanner({ preview, onCancel }: ChatterReplyBannerProps) {
  return (
    <div className="mb-2 flex items-start gap-2 rounded-lg border border-primary/25 bg-muted/50 px-2 py-2 dark:border-primary/20 dark:bg-muted/30">
      <CornerDownLeft
        className="mt-1 size-4 shrink-0 text-primary"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="sr-only">
          {portalChatter.replyingTo.replace('{name}', preview.authorName)}
        </p>
        <ChatterQuotedPreview
          authorName={preview.authorName}
          snippet={preview.snippet}
          variant="composer"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 cursor-pointer"
        onClick={onCancel}
        aria-label={portalChatter.cancelReply}
      >
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  )
}
