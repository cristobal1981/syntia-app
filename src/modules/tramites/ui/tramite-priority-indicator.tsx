import { tramites } from '@/content/tramites'
import { cn } from '@/lib/utils'
import { getTramitePriorityMeta } from '@/src/modules/tramites/domain/tramite-priority'
import type { TramitePriority } from '@/src/modules/tramites/domain/types'

const BAR_HEIGHT_PX = [6, 9, 12, 15] as const

/**
 * Prioridad en barras de nivel (como la señal del móvil): siempre visible, de un
 * vistazo y sin depender solo del color (cuántas barras hay encendidas). Con
 * `showLabel` añade la palabra («Alta»); sin ella es compacta, para la lista.
 */
export function TramitePriorityIndicator({
  priority,
  showLabel = false,
  className,
}: {
  priority: TramitePriority
  showLabel?: boolean
  className?: string
}) {
  const meta = getTramitePriorityMeta(priority)
  const accessibleLabel = tramites.priority.ariaLabel.replace('{level}', meta.label.toLowerCase())

  return (
    <span
      role="img"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={cn('inline-flex items-center gap-1.5', meta.toneClass, className)}
    >
      <span className="flex items-end gap-0.5" aria-hidden>
        {BAR_HEIGHT_PX.map((height, index) => (
          <span
            key={height}
            style={{ height }}
            className={cn('w-[4px] rounded-[1px] bg-current', index >= meta.bars && 'opacity-30')}
          />
        ))}
      </span>
      {showLabel ? (
        <span className="text-xs font-medium text-foreground/80" aria-hidden>
          {meta.label}
        </span>
      ) : null}
    </span>
  )
}
