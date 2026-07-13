'use client'

import { TicketPlus } from 'lucide-react'

import { portal } from '@/content/portal'
import { tramites } from '@/content/tramites'
import { buildPortalShortcutTooltipCopy } from '@/src/modules/portal/domain/portal-shortcut-platform'
import {
  formatPortalShortcutLabel,
  PORTAL_CREATE_CONSULTA_SHORTCUT,
} from '@/src/modules/portal/domain/portal-shortcuts'
import { PortalActionButton } from '@/src/modules/portal/ui/portal-action-button'
import { usePortalShortcutOverlay } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'

type TramiteCreateConsultaButtonProps = {
  onOpen?: () => void
  disabled?: boolean
  compact?: boolean
}

export function TramiteCreateConsultaButton({
  onOpen,
  disabled = false,
  compact = false,
}: TramiteCreateConsultaButtonProps) {
  const overlayActive = usePortalShortcutOverlay()
  const shortcutCopy = portal.shortcuts.createConsulta
  const label = tramites.createConsulta.button
  const shortcutLabel = formatPortalShortcutLabel(PORTAL_CREATE_CONSULTA_SHORTCUT)
  const tooltipCopy = buildPortalShortcutTooltipCopy(
    shortcutCopy,
    label,
    shortcutLabel
  )

  const tooltip = overlayActive ? tooltipCopy.active : tooltipCopy.idle

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
      shortcut={PORTAL_CREATE_CONSULTA_SHORTCUT}
      shortcutTone="onPrimary"
      tooltip={tooltip}
      ariaKeyshortcuts={shortcutLabel}
      overlayRingClassName="ring-2 ring-primary-foreground/25"
    />
  )
}
