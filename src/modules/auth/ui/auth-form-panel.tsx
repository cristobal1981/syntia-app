import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AuthFormPanelProps = {
  children: ReactNode
  className?: string
}

/** Contenedor sin cromo: el formulario respira directamente sobre el fondo. */
export function AuthFormPanel({ children, className }: AuthFormPanelProps) {
  return <div className={cn('w-full', className)}>{children}</div>
}
