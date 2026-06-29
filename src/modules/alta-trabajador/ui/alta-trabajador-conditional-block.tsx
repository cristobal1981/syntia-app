'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AltaTrabajadorConditionalBlockProps = {
  show: boolean
  children: ReactNode
  className?: string
}

export function AltaTrabajadorConditionalBlock({
  show,
  children,
  className,
}: AltaTrabajadorConditionalBlockProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5 p-4',
        className
      )}
    >
      {children}
    </div>
  )
}
