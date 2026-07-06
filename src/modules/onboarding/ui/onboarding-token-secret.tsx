'use client'

import { useState } from 'react'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { solicitudes } from '@/content/solicitudes'
import { copyTextToClipboard } from '@/lib/copy-to-clipboard'
import { cn } from '@/lib/utils'

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
      <code
        className="flex-1 truncate font-mono text-xs text-foreground"
        title={visible ? token : copy.hiddenHint}
      >
        {visible ? token : maskToken(token)}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? copy.hide : copy.show}
        title={visible ? copy.hide : copy.show}
      >
        {visible ? (
          <EyeOff className="size-3.5" aria-hidden />
        ) : (
          <Eye className="size-3.5" aria-hidden />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={handleCopy}
        aria-label={copy.copy}
        title={copy.copy}
      >
        <Copy className="size-3.5" aria-hidden />
      </Button>
    </div>
  )
}
