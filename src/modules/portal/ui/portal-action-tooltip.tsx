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
}

export function PortalActionTooltip({
  content,
  children,
  side = 'bottom',
  sideOffset,
  disabled = false,
}: PortalActionTooltipProps) {
  const trigger = disabled ? (
    <span className="inline-flex" tabIndex={0}>
      {children}
    </span>
  ) : (
    children
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
