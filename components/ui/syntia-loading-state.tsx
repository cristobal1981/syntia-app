import { SyntiaBoltLoader } from '@/components/ui/syntia-bolt-loader'
import { cn } from '@/lib/utils'

type SyntiaLoadingStateProps = {
  label?: string
  className?: string
  loaderSize?: number
  /**
   * Reserva altura en el flujo (para que la página no salte al terminar de
   * cargar) y centra el loader en ese hueco, es decir, en el área de contenido
   * y no en la ventana: el menú lateral desplazaría un centrado sobre la ventana.
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
      <div
        className={cn('relative min-h-[60dvh]', className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          {content}
        </div>
      </div>
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
