'use client'

import { useState } from 'react'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { solicitudes } from '@/content/solicitudes'
import { copyTextToClipboard } from '@/lib/copy-to-clipboard'
import { cn } from '@/lib/utils'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

type OnboardingTokenSecretProps = {
  token: string
  className?: string
}

function maskToken(token: string): string {
  const trimmed = token.trim()
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`
}

export function OnboardingTokenSecret({
  token,
  className,
}: OnboardingTokenSecretProps) {
  const copy = solicitudes.list.token
  const [visible, setVisible] = useState(false)

  async function handleCopy() {
    const copied = await copyTextToClipboard(token)
    if (copied) {
      toast.success(copy.copied)
      return
    }
    toast.error(copy.copyError)
  }

  return (
    <div className={cn('flex min-w-[12rem] items-center gap-1', className)}>
      {visible ? (
        <code className="flex-1 truncate font-mono text-xs text-foreground">
          {token}
        </code>
      ) : (
        <PortalActionTooltip content={copy.hiddenHint}>
          <code className="flex-1 truncate font-mono text-xs text-foreground">
            {maskToken(token)}
          </code>
        </PortalActionTooltip>
      )}
      <PortalActionTooltip content={visible ? copy.hide : copy.show}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? copy.hide : copy.show}
        >
          {visible ? (
            <EyeOff className="size-3.5" aria-hidden />
          ) : (
            <Eye className="size-3.5" aria-hidden />
          )}
        </Button>
      </PortalActionTooltip>
      <PortalActionTooltip content={copy.copy}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={handleCopy}
          aria-label={copy.copy}
        >
          <Copy className="size-3.5" aria-hidden />
        </Button>
      </PortalActionTooltip>
    </div>
  )
}
