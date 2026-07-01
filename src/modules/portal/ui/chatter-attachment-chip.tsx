import { FileText } from 'lucide-react'

import { portalChatter } from '@/content/portal-chatter'
import { cn } from '@/lib/utils'

type ChatterAttachmentChipProps = {
  name: string
  variant?: 'client' | 'advisor'
  onClick?: () => void
}

export function ChatterAttachmentChip({
  name,
  variant = 'advisor',
  onClick,
}: ChatterAttachmentChipProps) {
  const label = portalChatter.openInDocuments.replace('{name}', name)

  if (!onClick) {
    return (
      <span
        className={cn(
          'inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs',
          variant === 'client'
            ? 'bg-primary-foreground/15 text-primary-foreground'
            : 'bg-background/80 text-foreground'
        )}
      >
        <FileText className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{name}</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-left text-xs transition-opacity hover:opacity-80',
        variant === 'client'
          ? 'bg-primary-foreground/15 text-primary-foreground'
          : 'bg-background/80 text-foreground'
      )}
      aria-label={label}
    >
      <FileText className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{name}</span>
    </button>
  )
}
