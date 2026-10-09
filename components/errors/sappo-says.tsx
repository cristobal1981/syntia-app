import { Sappo } from '@/components/errors/sappo'
import type { SappoMood } from '@/content/errors'
import { cn } from '@/lib/utils'

type SappoSaysProps = {
  mood: SappoMood
  children: React.ReactNode
  className?: string
  /** Desde `md`, Sappo pasa al extremo derecho y el bocadillo queda a su izquierda. */
  reverse?: boolean
}

/** Sappo pequeño con un bocadillo al lado, para acompañar secciones del portal. */
export function SappoSays({ mood, children, className, reverse = false }: SappoSaysProps) {
  return (
    <div className={cn('flex items-center gap-3', reverse && 'md:flex-row-reverse', className)}>
      <Sappo mood={mood} className="block h-14 w-auto shrink-0" />
      <p className="relative max-w-xs rounded-2xl border border-primary/20 bg-card px-3.5 py-2.5 text-sm leading-snug font-medium text-foreground shadow-xs">
        <span
          aria-hidden
          className={cn(
            'absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rotate-45 border-b border-l border-primary/20 bg-card',
            reverse &&
              'md:-right-1.5 md:left-auto md:border-t md:border-r md:border-b-0 md:border-l-0'
          )}
        />
        {children}
      </p>
    </div>
  )
}
