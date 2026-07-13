'use client'

import type { ReactElement, ReactNode } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type PortalActionTooltipProps = {
  content: ReactNode
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  disabled?: boolean
  /** Fuerza el tooltip cerrado (p. ej. truncado aún no detectado). */
  open?: boolean
}

export function PortalActionTooltip({
  content,
  children,
  side = 'bottom',
  sideOffset,
  disabled = false,
  open,
}: PortalActionTooltipProps) {
  const trigger = disabled ? (
    <span className="inline-flex" tabIndex={0}>
      {children}
    </span>
  ) : (
    children
  )

  return (
    <Tooltip {...(open === undefined ? {} : { open })}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
