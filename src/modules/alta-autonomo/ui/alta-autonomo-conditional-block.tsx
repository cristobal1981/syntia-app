'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AltaAutonomoConditionalBlockProps = {
  visible: boolean
  children: ReactNode
  className?: string
}

/** Bloque que aparece solo cuando la respuesta previa lo activa. */
export function AltaAutonomoConditionalBlock({
  visible,
  children,
  className,
}: AltaAutonomoConditionalBlockProps) {
  if (!visible) return null

  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-l-2 border-primary/40 pl-4',
        className
      )}
    >
      {children}
    </div>
  )
}
