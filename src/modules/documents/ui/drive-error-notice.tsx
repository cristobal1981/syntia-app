'use client'

import { CircleAlert, Info, LogIn, RefreshCw, TriangleAlert, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  presentDriveError,
  type DriveErrorContext,
  type DriveUiErrorCode,
} from '@/src/modules/documents/domain/drive-error-presentation'
import { cn } from '@/lib/utils'

type DriveErrorNoticeProps = {
  code: DriveUiErrorCode
  context: DriveErrorContext
  /** `panel` ocupa el hueco de la lista; `banner` va encima sin quitarla. */
  variant?: 'panel' | 'banner'
  onRetry?: () => void
  onHome?: () => void
  onDismiss?: () => void
  className?: string
}

const TONE_STYLES = {
  info: { icon: Info, box: 'border-border bg-muted/30', iconClass: 'text-primary' },
  warning: {
    icon: TriangleAlert,
    box: 'border-amber-500/40 bg-amber-500/5',
    iconClass: 'text-amber-500',
  },
  error: {
    icon: CircleAlert,
    box: 'border-destructive/40 bg-destructive/5',
    iconClass: 'text-destructive',
  },
} as const

export function DriveErrorNotice({
  code,
  context,
  variant = 'banner',
  onRetry,
  onHome,
  onDismiss,
  className,
}: DriveErrorNoticeProps) {
  const presentation = presentDriveError(code, context)
  const tone = TONE_STYLES[presentation.tone]
  const Icon = code === 'offline' ? WifiOff : tone.icon
  const isPanel = variant === 'panel'

  const buttons = presentation.actions.flatMap((action) => {
    switch (action) {
      case 'retry':
        return onRetry
          ? [
              <Button key={action} type="button" size="sm" className="cursor-pointer" onClick={onRetry}>
                <RefreshCw className="size-4" aria-hidden />
                Reintentar
              </Button>,
            ]
          : []
      case 'home':
        return onHome
          ? [
              <Button key={action} type="button" size="sm" variant="outline" className="cursor-pointer" onClick={onHome}>
                Ir a Inicio
              </Button>,
            ]
          : []
      case 'login':
        return [
          <Button key={action} asChild size="sm">
            <a href="/login">
              <LogIn className="size-4" aria-hidden />
              Iniciar sesión
            </a>
          </Button>,
        ]
      case 'reload':
        return [
          <Button
            key={action}
            type="button"
            size="sm"
            className="cursor-pointer"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="size-4" aria-hidden />
            Recargar página
          </Button>,
        ]
      case 'dismiss':
        return onDismiss
          ? [
              <Button key={action} type="button" size="sm" variant="ghost" className="cursor-pointer" onClick={onDismiss}>
                Entendido
              </Button>,
            ]
          : []
    }
  })

  return (
    <div
      role={presentation.tone === 'info' ? 'status' : 'alert'}
      className={cn(
        'rounded-xl border shadow-xs',
        tone.box,
        isPanel
          ? 'flex flex-col items-center gap-3 px-6 py-12 text-center'
          : 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center',
        className
      )}
    >
      <Icon
        className={cn('shrink-0', tone.iconClass, isPanel ? 'size-10' : 'size-5')}
        strokeWidth={1.75}
        aria-hidden
      />
      <div className={cn('min-w-0', !isPanel && 'flex-1')}>
        <p className="font-medium text-foreground">{presentation.title}</p>
        <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">{presentation.description}</p>
      </div>
      {buttons.length > 0 ? (
        <div className={cn('flex shrink-0 flex-wrap gap-2', isPanel && 'justify-center')}>{buttons}</div>
      ) : null}
    </div>
  )
}
