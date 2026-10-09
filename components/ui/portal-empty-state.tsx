import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type PortalEmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  /** Aclaración secundaria, en un tono más suave que la descripción. */
  hint?: string
  /** Acción principal (p. ej. un botón de subir). */
  action?: React.ReactNode
  className?: string
}

/** Estado vacío estándar del portal: tarjeta con icono, título y explicación. */
export function PortalEmptyState({
  icon: Icon,
  title,
  description,
  hint,
  action,
  className,
}: PortalEmptyStateProps) {
  return (
    <div
      className={cn(
        'portal-home-card flex flex-col items-center rounded-xl px-6 py-12 text-center md:px-8',
        className
      )}
    >
      <div
        className="flex size-12 items-center justify-center rounded-xl bg-muted/60 dark:bg-muted/40"
        aria-hidden
      >
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-5 font-sans text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {hint ? (
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-subtle-foreground">{hint}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
