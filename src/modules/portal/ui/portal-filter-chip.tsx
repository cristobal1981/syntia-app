'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

export function portalFilterChipClasses(active: boolean) {
  return cn(
    active
      ? 'dark:border dark:border-primary/55 dark:bg-primary/28 dark:text-primary dark:hover:bg-primary/35 dark:shadow-none'
      : 'dark:border dark:border-border/70 dark:bg-background dark:text-muted-foreground dark:hover:border-border dark:hover:bg-muted/70 dark:hover:text-foreground dark:shadow-none'
  )
}

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
      className={cn('cursor-pointer', portalFilterChipClasses(active))}
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

type PortalFilterIconChipProps = {
  label: string
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
  tooltip?: string
  'aria-keyshortcuts'?: string
}

export function PortalFilterIconChip({
  label,
  active,
  onClick,
  children,
  className,
  tooltip,
  'aria-keyshortcuts': ariaKeyshortcuts,
}: PortalFilterIconChipProps) {
  const button = (
    <Button
      type="button"
      size="icon"
      variant={active ? 'secondary' : 'outline'}
      aria-label={label}
      aria-pressed={active}
      aria-keyshortcuts={ariaKeyshortcuts}
      onClick={onClick}
      className={cn('size-9 cursor-pointer', portalFilterChipClasses(active), className)}
    >
      {children}
    </Button>
  )

  if (!tooltip) return button

  return <PortalActionTooltip content={tooltip}>{button}</PortalActionTooltip>
}
