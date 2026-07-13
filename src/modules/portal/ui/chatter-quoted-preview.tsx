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
          'border-agua bg-background/65 text-foreground dark:bg-background/75 dark:border-foreground',
        variant === 'advisor' &&
          'border-primary/80 bg-background text-foreground dark:bg-primary/10',
        variant === 'composer' &&
          'border-primary bg-primary/5 text-foreground dark:bg-primary/10',
        className
      )}
    >
      <p
        className={cn(
          'text-[11px] font-semibold leading-tight',
          variant === 'client' ? 'text-agua dark:text-foreground' : 'text-foreground'
        )}
      >
        {authorName}
      </p>
      <p
        className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground"
      >
        {snippet}
      </p>
    </div>
  )
}
