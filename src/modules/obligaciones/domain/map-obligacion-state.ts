import { obligaciones } from '@/content/obligaciones'
import {
  getTaskStateBadge,
  type TaskStateBadgeVariant,
} from '@/src/modules/tramites/domain/map-task-state'

const OBLIGACION_STATE_LABELS: Record<TaskStateBadgeVariant, string> = {
  inProgress: obligaciones.taskStates.inProgress,
  changesRequested: obligaciones.taskStates.changesRequested,
  done: obligaciones.taskStates.done,
  canceled: obligaciones.taskStates.canceled,
  unknown: '—',
}

export function getObligacionStateBadge(state?: string): {
  label: string
  variant: TaskStateBadgeVariant
} {
  const badge = getTaskStateBadge(state)

  return {
    variant: badge.variant,
    label:
      badge.variant === 'unknown'
        ? badge.label
        : OBLIGACION_STATE_LABELS[badge.variant],
  }
}
