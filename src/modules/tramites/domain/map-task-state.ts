import { tramites } from '@/content/tramites'

export type TaskStateBadgeVariant =
  | 'inProgress'
  | 'changesRequested'
  | 'done'
  | 'canceled'
  | 'unknown'

const CHANGES_REQUESTED_STATES = new Set(['02_changes_requested'])

const IN_PROGRESS_STATES = new Set([
  '01_in_progress',
  '03_approved',
  '04_waiting_normal',
])

const DONE_STATES = new Set(['1_done', 'done'])
const CANCELED_STATES = new Set(['1_canceled', 'canceled', 'cancelled'])

export function getTaskStateBadge(state?: string): {
  label: string
  variant: TaskStateBadgeVariant
} {
  if (!state) {
    return { label: '—', variant: 'unknown' }
  }

  if (CHANGES_REQUESTED_STATES.has(state)) {
    return {
      label: tramites.taskStates.changesRequested,
      variant: 'changesRequested',
    }
  }

  if (IN_PROGRESS_STATES.has(state)) {
    return { label: tramites.taskStates.inProgress, variant: 'inProgress' }
  }

  if (DONE_STATES.has(state)) {
    return { label: tramites.taskStates.done, variant: 'done' }
  }

  if (CANCELED_STATES.has(state)) {
    return { label: tramites.taskStates.canceled, variant: 'canceled' }
  }

  return {
    label: state.replaceAll('_', ' '),
    variant: 'unknown',
  }
}

export function mapTaskStateLabel(state?: string): string | undefined {
  const badge = getTaskStateBadge(state)
  return badge.label === '—' ? undefined : badge.label
}

export function isTaskClosed(state?: string): boolean {
  if (!state) return false
  return DONE_STATES.has(state) || CANCELED_STATES.has(state)
}
