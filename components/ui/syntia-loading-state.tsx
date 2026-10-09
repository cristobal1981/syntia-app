import { SyntiaBoltLoader } from '@/components/ui/syntia-bolt-loader'
import { cn } from '@/lib/utils'

type SyntiaLoadingStateProps = {
  label?: string
  className?: string
  loaderSize?: number
  /**
   * Centra el loader en el centro de la VENTANA (vertical y horizontal), no en el
   * hueco que deja el contenido. Flota sobre la página sin bloquear clics y
   * reserva altura en el flujo para que la página no salte al terminar de cargar.
   */
  centered?: boolean
}

export function SyntiaLoadingState({
  label = 'Cargando',
  className,
  loaderSize = 72,
  centered = false,
}: SyntiaLoadingStateProps) {
  const content = (
    <>
      <SyntiaBoltLoader size={loaderSize} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </>
  )

  if (centered) {
    return (
      <>
        <div aria-hidden className="min-h-[60dvh]" />
        <div
          className={cn(
            'pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center gap-3',
            className
          )}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          {content}
        </div>
      </>
    )
  }

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {content}
    </div>
  )
}
