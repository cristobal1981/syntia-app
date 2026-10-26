import type { ReactNode } from 'react'

type PortalSettingRowProps = {
  title: string
  description?: string
  /** Control a la derecha (normalmente un interruptor). */
  control?: ReactNode
  /** Lo que se despliega bajo la fila cuando el ajuste está activo. */
  children?: ReactNode
}

/** Un ajuste: título y descripción a la izquierda, control a la derecha y detalle debajo. */
export function PortalSettingRow({ title, description, control, children }: PortalSettingRowProps) {
  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-sans text-sm font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {control ? <div className="shrink-0 pt-0.5">{control}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}
