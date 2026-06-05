import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type GradientCardProps = {
  children: ReactNode
  className?: string
  padding?: 'default' | 'compact'
  gradient?: 'default' | 'strong'
}

export function GradientCard({
  children,
  className,
  padding = 'default',
  gradient = 'default',
}: GradientCardProps) {
  return (
    <div
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-agua/30 bg-gradient-to-br transition-all duration-300 motion-reduce:transition-none hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 motion-reduce:hover:translate-y-0',
        gradient === 'strong'
          ? 'from-card to-agua/25 hover:border-primary/40'
          : 'from-card to-agua/20 hover:border-primary/50',
        padding === 'compact' ? 'p-6' : 'p-6 lg:p-8',
        className
      )}
    >
      {children}
    </div>
  )
}
