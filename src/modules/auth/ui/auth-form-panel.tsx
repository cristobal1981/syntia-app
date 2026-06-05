import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AuthFormPanelProps = {
  children: ReactNode
  className?: string
}

export function AuthFormPanel({ children, className }: AuthFormPanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-agua/25 bg-card/40 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8',
        className
      )}
    >
      {children}
    </div>
  )
}
