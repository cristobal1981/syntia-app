'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

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
      variant={active ? 'filterActive' : 'filter'}
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
      variant={active ? 'filterActive' : 'filter'}
      aria-label={label}
      aria-pressed={active}
      aria-keyshortcuts={ariaKeyshortcuts}
      onClick={onClick}
      className={cn('size-9', className)}
    >
      {children}
    </Button>
  )

  if (!tooltip) return button

  return <PortalActionTooltip content={tooltip}>{button}</PortalActionTooltip>
}
