import { Sappo } from '@/components/errors/sappo'
import type { SappoMood } from '@/content/errors'
import { cn } from '@/lib/utils'

type SappoSaysProps = {
  mood: SappoMood
  children: React.ReactNode
  className?: string
}

/** Sappo pequeño con un bocadillo al lado, para acompañar secciones del portal. */
export function SappoSays({ mood, children, className }: SappoSaysProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Sappo mood={mood} className="block h-16 w-auto shrink-0" />
      <p className="relative max-w-xs rounded-2xl border border-primary/20 bg-card px-3.5 py-2.5 text-sm leading-snug font-medium text-foreground shadow-xs">
        <span
          aria-hidden
          className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rotate-45 border-b border-l border-primary/20 bg-card"
        />
        {children}
      </p>
    </div>
  )
}
