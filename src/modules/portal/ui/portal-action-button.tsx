'use client'

import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PortalShortcutDefinition } from '@/src/modules/portal/domain/portal-shortcuts'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { PortalShortcutHint } from '@/src/modules/portal/ui/portal-shortcut-hint'
import { usePortalShortcutOverlay } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'

export type PortalActionButtonIconBehavior =
  | 'none'
  | 'static'
  | 'spinWhenPending'
  | 'scaleOnHover'

type PortalActionButtonProps = {
  label: string
  pendingLabel?: string
  pending?: boolean
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg'
  compact?: boolean
  icon?: LucideIcon
  iconBehavior?: PortalActionButtonIconBehavior
  iconClassName?: string
  shortcut?: PortalShortcutDefinition
  shortcutTone?: 'default' | 'onPrimary'
  showShortcutHint?: boolean
  tooltip: string
  ariaKeyshortcuts?: string
  overlayRingClassName?: string
  className?: string
  type?: 'button' | 'submit'
  dataTour?: string
}

function resolveIconClassName(
  behavior: PortalActionButtonIconBehavior,
  pending: boolean,
  disabled: boolean,
  isPrimaryVariant: boolean,
  extra?: string
): string {
  const base = 'size-4 shrink-0 motion-reduce:transition-none'

  if (behavior === 'spinWhenPending') {
    return cn(
      base,
      'transition-[color,opacity]',
      pending
        ? 'animate-spin text-muted-foreground motion-reduce:animate-none'
        : 'group-hover:text-primary group-disabled:opacity-50',
      extra
    )
  }

  if (behavior === 'scaleOnHover') {
    return cn(
      base,
      isPrimaryVariant && 'text-primary-foreground',
      'transition-transform',
      !disabled &&
        !pending &&
        'group-hover:scale-110 motion-reduce:group-hover:scale-100',
      extra
    )
  }

  if (behavior === 'static') {
    return cn(base, extra)
  }

  return cn(base, extra)
}

export function PortalActionButton({
  label,
  pendingLabel,
  pending = false,
  onClick,
  disabled = false,
  variant = 'outline',
  size = 'default',
  compact = false,
  icon: Icon,
  iconBehavior = 'static',
  iconClassName,
  shortcut,
  shortcutTone = 'default',
  showShortcutHint = true,
  tooltip,
  ariaKeyshortcuts,
  overlayRingClassName,
  className,
  type = 'button',
  dataTour,
}: PortalActionButtonProps) {
  const overlayActive = usePortalShortcutOverlay()
  const resolvedDisabled = disabled || pending
  const displayLabel = pending && pendingLabel ? pendingLabel : label

  return (
    <PortalActionTooltip content={tooltip} disabled={resolvedDisabled}>
      <Button
        type={type}
        variant={variant}
        size={size}
        disabled={resolvedDisabled}
        aria-busy={pending || undefined}
        aria-keyshortcuts={ariaKeyshortcuts}
        data-tour={dataTour}
        onClick={onClick}
        className={cn(
          'group',
          overlayActive && !resolvedDisabled && overlayRingClassName,
          className
        )}
      >
        {Icon ? (
          <Icon
            className={resolveIconClassName(
              iconBehavior,
              pending,
              resolvedDisabled,
              variant === 'default',
              iconClassName
            )}
            aria-hidden
          />
        ) : null}
        <span className={cn(compact && 'hidden lg:inline')}>{displayLabel}</span>
        {shortcut && showShortcutHint && !resolvedDisabled ? (
          <PortalShortcutHint shortcut={shortcut} tone={shortcutTone} />
        ) : null}
      </Button>
    </PortalActionTooltip>
  )
}
