import { cn } from '@/lib/utils'

type ChatterQuotedPreviewProps = {
  authorName: string
  snippet: string
  variant?: 'client' | 'advisor' | 'composer'
  className?: string
}

export function ChatterQuotedPreview({
  authorName,
  snippet,
  variant = 'advisor',
  className,
}: ChatterQuotedPreviewProps) {
  return (
    <div
      className={cn(
        'rounded-md border-l-[3px] px-2.5 py-1.5',
        variant === 'client' &&
          'border-primary-foreground/70 bg-primary-foreground/10 text-primary-foreground',
        variant === 'advisor' &&
          'border-primary/70 bg-background/70 text-foreground dark:bg-background/40',
        variant === 'composer' &&
          'border-primary bg-primary/5 text-foreground dark:bg-primary/10',
        className
      )}
    >
      <p
        className={cn(
          'text-[11px] font-semibold leading-tight',
          variant === 'client' ? 'text-primary-foreground' : 'text-foreground'
        )}
      >
        {authorName}
      </p>
      <p
        className={cn(
          'mt-0.5 line-clamp-2 text-xs leading-snug',
          variant === 'client'
            ? 'text-primary-foreground/85'
            : 'text-muted-foreground'
        )}
      >
        {snippet}
      </p>
    </div>
  )
}
