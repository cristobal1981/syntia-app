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
  size?: 'sm' | 'lg'
}

function maskToken(token: string): string {
  const trimmed = token.trim()
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`
}

export function OnboardingTokenSecret({
  token,
  className,
  size = 'sm',
}: OnboardingTokenSecretProps) {
  const copy = solicitudes.list.token
  const [visible, setVisible] = useState(false)
  const isLarge = size === 'lg'

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
        <code
          className={cn(
            'flex-1 truncate font-mono text-foreground',
            isLarge ? 'text-sm' : 'text-xs'
          )}
        >
          {token}
        </code>
      ) : (
        <PortalActionTooltip content={copy.hiddenHint}>
          <code
            className={cn(
              'flex-1 truncate font-mono text-foreground',
              isLarge ? 'text-sm' : 'text-xs'
            )}
          >
            {maskToken(token)}
          </code>
        </PortalActionTooltip>
      )}
      <PortalActionTooltip content={visible ? copy.hide : copy.show}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('shrink-0', isLarge ? 'size-8' : 'size-7')}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? copy.hide : copy.show}
        >
          {visible ? (
            <EyeOff className={isLarge ? 'size-4' : 'size-3.5'} aria-hidden />
          ) : (
            <Eye className={isLarge ? 'size-4' : 'size-3.5'} aria-hidden />
          )}
        </Button>
      </PortalActionTooltip>
      <PortalActionTooltip content={copy.copy}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('shrink-0', isLarge ? 'size-8' : 'size-7')}
          onClick={handleCopy}
          aria-label={copy.copy}
        >
          <Copy className={isLarge ? 'size-4' : 'size-3.5'} aria-hidden />
        </Button>
      </PortalActionTooltip>
    </div>
  )
}
