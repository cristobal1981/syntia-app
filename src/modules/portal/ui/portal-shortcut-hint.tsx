'use client'

import { cn } from '@/lib/utils'
import {
  getPortalShortcutActionKeys,
  type PortalShortcutDefinition,
} from '@/src/modules/portal/domain/portal-shortcuts'
import { usePortalShortcutOverlay } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'

type PortalShortcutHintProps = {
  shortcut: PortalShortcutDefinition
  className?: string
  tone?: 'default' | 'onPrimary'
}

const kbdToneClasses = {
  default: 'border-primary/30 bg-primary/10 text-primary',
  onPrimary:
    'border-primary-foreground bg-primary-foreground text-white shadow-sm',
} as const

export function PortalShortcutHint({
  shortcut,
  className,
  tone = 'default',
}: PortalShortcutHintProps) {
  const overlayActive = usePortalShortcutOverlay()

  if (!overlayActive) return null

  const keys = getPortalShortcutActionKeys(shortcut)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-100',
        className
      )}
      aria-hidden="true"
    >
      {keys.map((key) => (
        <kbd
          key={key}
          className={cn(
            'min-w-[1.125rem] rounded border px-1 py-px text-center font-sans text-[10px] font-semibold leading-none',
            kbdToneClasses[tone]
          )}
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}
