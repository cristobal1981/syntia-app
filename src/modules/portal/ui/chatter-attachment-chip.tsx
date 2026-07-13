import { FileText } from 'lucide-react'

import { portalChatter } from '@/content/portal-chatter'
import { cn } from '@/lib/utils'

type ChatterAttachmentChipProps = {
  name: string
  variant?: 'client' | 'advisor'
  ariaLabel?: string
  onClick?: () => void
  className?: string
}

export function ChatterAttachmentChip({
  name,
  variant = 'advisor',
  ariaLabel,
  onClick,
  className,
}: ChatterAttachmentChipProps) {
  const label =
    ariaLabel ?? portalChatter.openInDocuments.replace('{name}', name)

  if (!onClick) {
    return (
      <span
        className={cn(
          'inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs',
          variant === 'client'
            ? 'bg-turquesa/12 text-agua dark:bg-turquesa/16 dark:text-brisa'
            : 'bg-background/80 text-foreground',
          className
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
          ? 'bg-foreground/60 text-background dark:bg-background/90 dark:text-primary'
          : 'bg-foreground/60 text-background dark:bg-primary/20 dark:text-foreground',
        className
      )}
      aria-label={label}
    >
      <FileText className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{name}</span>
    </button>
  )
}
