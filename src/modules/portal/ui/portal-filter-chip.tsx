'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PortalFilterChipProps = {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}

export function PortalFilterChip({
  label,
  count,
  active,
  onClick,
}: PortalFilterChipProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'secondary' : 'outline'}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        active
          ? 'dark:border dark:border-primary/55 dark:bg-primary/28 dark:text-primary dark:hover:bg-primary/35 dark:shadow-none'
          : 'dark:border dark:border-border/70 dark:bg-background dark:text-muted-foreground dark:hover:border-border dark:hover:bg-muted/70 dark:hover:text-foreground dark:shadow-none'
      )}
    >
      {label}
      {count !== undefined ? (
        <span
          className={cn(
            'ml-1.5 tabular-nums',
            active ? 'text-secondary-foreground/90' : 'text-muted-foreground'
          )}
        >
          ({count})
        </span>
      ) : null}
    </Button>
  )
}
