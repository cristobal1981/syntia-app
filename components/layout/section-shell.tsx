import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionShellProps {
  id?: string
  className?: string
  innerClassName?: string
  children: ReactNode
}

export function SectionShell({
  id,
  className,
  innerClassName,
  children,
}: SectionShellProps) {
  return (
    <section id={id} className={className}>
      <div
        className={cn(
          'relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
          innerClassName
        )}
      >
        {children}
      </div>
    </section>
  )
}
