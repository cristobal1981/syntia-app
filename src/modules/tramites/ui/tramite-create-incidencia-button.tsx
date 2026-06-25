'use client'

import { TicketPlus } from 'lucide-react'

import { portal } from '@/content/portal'
import { tramites } from '@/content/tramites'
import { PORTAL_CREATE_INCIDENCIA_SHORTCUT } from '@/src/modules/portal/domain/portal-shortcuts'
import { PortalActionButton } from '@/src/modules/portal/ui/portal-action-button'
import { usePortalShortcutOverlay } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'

type TramiteCreateIncidenciaButtonProps = {
  onOpen?: () => void
  disabled?: boolean
  compact?: boolean
}

export function TramiteCreateIncidenciaButton({
  onOpen,
  disabled = false,
  compact = false,
}: TramiteCreateIncidenciaButtonProps) {
  const overlayActive = usePortalShortcutOverlay()
  const shortcutCopy = portal.shortcuts.createIncidencia
  const label = tramites.createIncidencia.button

  const tooltip = overlayActive
    ? shortcutCopy.buttonHintActive.replace('{action}', label)
    : shortcutCopy.buttonHintIdle.replace('{action}', label)

  return (
    <PortalActionButton
      label={label}
      onClick={onOpen}
      disabled={disabled}
      variant="default"
      size={compact ? 'sm' : 'default'}
      compact={compact}
      icon={TicketPlus}
      iconBehavior="scaleOnHover"
      shortcut={PORTAL_CREATE_INCIDENCIA_SHORTCUT}
      shortcutTone="onPrimary"
      tooltip={tooltip}
      ariaKeyshortcuts={shortcutCopy.label}
      overlayRingClassName="ring-2 ring-primary-foreground/25"
    />
  )
}
