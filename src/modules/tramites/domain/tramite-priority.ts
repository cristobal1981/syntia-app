import { tramites } from '@/content/tramites'
import type { TramitePriority } from '@/src/modules/tramites/domain/types'

export type TramitePriorityMeta = {
  level: TramitePriority
  label: string
  /** Barras encendidas de 4: la baja enciende una, la urgente las cuatro. */
  bars: 1 | 2 | 3 | 4
  /** Color de las barras (hereda `currentColor`): de gris a rojo según sube. */
  toneClass: string
}

const TONE_CLASS: Record<TramitePriority, string> = {
  0: 'text-muted-foreground',
  1: 'text-amber-500',
  2: 'text-orange-500',
  3: 'text-destructive',
}

export function getTramitePriorityMeta(priority: TramitePriority): TramitePriorityMeta {
  return {
    level: priority,
    label: tramites.priority.levels[priority],
    bars: (priority + 1) as 1 | 2 | 3 | 4,
    toneClass: TONE_CLASS[priority],
  }
}
