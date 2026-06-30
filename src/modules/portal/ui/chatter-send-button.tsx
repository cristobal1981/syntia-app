'use client'

import { Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portalChatter } from '@/content/portal-chatter'
import {
  formatChatterShortcut,
  formatChatterShortcutHint,
} from '@/src/modules/portal/lib/chatter-shortcuts'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

const SEND_SHORTCUT_PARTS = ['Mod', 'Enter'] as const

type ChatterSendButtonProps = {
  pending?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}

export function ChatterSendButton({
  pending = false,
  disabled = false,
  type = 'submit',
  onClick,
}: ChatterSendButtonProps) {
  const shortcutLabel = formatChatterShortcut([...SEND_SHORTCUT_PARTS])
  const tooltip = formatChatterShortcutHint(
    pending ? portalChatter.sending : portalChatter.sendButton,
    [...SEND_SHORTCUT_PARTS]
  )

  return (
    <PortalActionTooltip content={tooltip} disabled={disabled || pending}>
      <Button
        type={type}
        size="icon"
        className="size-10 shrink-0 rounded-full"
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        aria-label={pending ? portalChatter.sending : portalChatter.sendButton}
        aria-keyshortcuts={shortcutLabel}
        onClick={onClick}
      >
        {pending ? (
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <Send className="size-4" aria-hidden />
        )}
      </Button>
    </PortalActionTooltip>
  )
}
