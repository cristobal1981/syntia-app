'use client'

import { useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

import { portal } from '@/content/portal'
import {
  buildPortalShortcutTooltipCopy,
} from '@/src/modules/portal/domain/portal-shortcut-platform'
import {
  formatPortalShortcutLabel,
  PORTAL_REFRESH_SHORTCUT,
} from '@/src/modules/portal/domain/portal-shortcuts'
import { PortalActionButton } from '@/src/modules/portal/ui/portal-action-button'
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
  const shortcutLabel = formatPortalShortcutLabel(PORTAL_REFRESH_SHORTCUT)
  const tooltipCopy = buildPortalShortcutTooltipCopy(
    shortcutCopy,
    label,
    shortcutLabel
  )

  const refresh = useCallback(() => {
    if (pending) return

    startTransition(() => {
      router.refresh()
    })
  }, [pending, router])

  usePortalShortcut(PORTAL_REFRESH_SHORTCUT, refresh, { enabled: !pending })

  const tooltip = overlayActive ? tooltipCopy.active : tooltipCopy.idle

  return (
    <PortalActionButton
      label={label}
      pendingLabel={refreshingLabel}
      pending={pending}
      onClick={refresh}
      variant="outline"
      icon={RefreshCw}
      iconBehavior="spinWhenPending"
      shortcut={PORTAL_REFRESH_SHORTCUT}
      tooltip={tooltip}
      ariaKeyshortcuts={shortcutLabel}
      overlayRingClassName="ring-2 ring-primary/35"
    />
  )
}
