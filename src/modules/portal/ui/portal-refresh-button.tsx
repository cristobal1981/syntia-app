'use client'

import { useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { PORTAL_REFRESH_SHORTCUT } from '@/src/modules/portal/domain/portal-shortcuts'
import { PortalShortcutHint } from '@/src/modules/portal/ui/portal-shortcut-hint'
import { usePortalShortcutOverlay } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'
import { usePortalShortcut } from '@/src/modules/portal/ui/use-portal-shortcut'

type PortalRefreshButtonProps = {
  label: string
  refreshingLabel: string
}

export function PortalRefreshButton({
  label,
  refreshingLabel,
}: PortalRefreshButtonProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const overlayActive = usePortalShortcutOverlay()
  const shortcutCopy = portal.shortcuts.refresh

  const refresh = useCallback(() => {
    if (pending) return

    startTransition(() => {
      router.refresh()
    })
  }, [pending, router])

  usePortalShortcut(PORTAL_REFRESH_SHORTCUT, refresh, { enabled: !pending })

  const tooltip = overlayActive
    ? shortcutCopy.buttonHintActive.replace('{action}', label)
    : shortcutCopy.buttonHintIdle.replace('{action}', label)

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      aria-busy={pending}
      aria-keyshortcuts={shortcutCopy.label}
      title={tooltip}
      onClick={refresh}
      className={cn(overlayActive && !pending && 'ring-2 ring-primary/35')}
    >
      <span>{pending ? refreshingLabel : label}</span>
      {!pending ? <PortalShortcutHint shortcut={PORTAL_REFRESH_SHORTCUT} /> : null}
    </Button>
  )
}
