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
