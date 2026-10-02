import { describe, expect, it } from 'vitest'

import { obligaciones } from '@/content/obligaciones'
import { getObligacionStateBadge } from '@/src/modules/obligaciones/domain/map-obligacion-state'

describe('getObligacionStateBadge', () => {
  it('maps "done" to the obligaciones-specific label (not the shared tramites one)', () => {
    expect(getObligacionStateBadge('done')).toEqual({
      label: obligaciones.taskStates.done,
      variant: 'done',
    })
  })

  it.each([
    ['01_in_progress', 'inProgress'],
    ['02_changes_requested', 'changesRequested'],
    ['canceled', 'canceled'],
  ] as const)('maps "%s" to the obligaciones label for variant "%s"', (state, variant) => {
    expect(getObligacionStateBadge(state)).toEqual({
      label: obligaciones.taskStates[variant],
      variant,
    })
  })

  it('an unknown state keeps the raw-text label from the shared mapper instead of an obligaciones copy entry (there is none for "unknown")', () => {
    const badge = getObligacionStateBadge('some_future_stage')
    expect(badge.variant).toBe('unknown')
    expect(badge.label).toBe('some future stage')
  })

  it('an undefined state renders as the em-dash unknown badge', () => {
    expect(getObligacionStateBadge(undefined)).toEqual({ label: '—', variant: 'unknown' })
  })
})
