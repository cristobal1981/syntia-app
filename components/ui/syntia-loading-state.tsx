import { SyntiaBoltLoader } from '@/components/ui/syntia-bolt-loader'
import { cn } from '@/lib/utils'

type SyntiaLoadingStateProps = {
  label?: string
  className?: string
  loaderSize?: number
}

export function SyntiaLoadingState({
  label = 'Cargando',
  className,
  loaderSize = 72,
}: SyntiaLoadingStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <SyntiaBoltLoader size={loaderSize} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
