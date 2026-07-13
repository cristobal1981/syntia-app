import { portalDocuments } from '@/content/portal-documents'
import { cn } from '@/lib/utils'

type PreviewFormatBadgeProps = {
  className?: string
}

export function PreviewFormatBadge({ className }: PreviewFormatBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-center text-xs font-medium text-amber-950',
        'dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100',
        className
      )}
    >
      {portalDocuments.previewFormatBadge}
    </span>
  )
}
