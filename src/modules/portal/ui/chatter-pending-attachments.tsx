import { FileText, X } from 'lucide-react'

import { portalChatter } from '@/content/portal-chatter'
import { Button } from '@/components/ui/button'

type ChatterPendingAttachmentsProps = {
  files: File[]
  disabled?: boolean
  onRemove: (index: number) => void
}

export function ChatterPendingAttachments({
  files,
  disabled = false,
  onRemove,
}: ChatterPendingAttachmentsProps) {
  if (!files.length) return null

  return (
    <ul className="mb-2 flex flex-col gap-1">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${file.size}-${index}`}
          className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 dark:border-border/50"
        >
          <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-xs text-foreground">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 cursor-pointer"
            disabled={disabled}
            onClick={() => onRemove(index)}
            aria-label={portalChatter.removeAttachment.replace('{name}', file.name)}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  )
}
