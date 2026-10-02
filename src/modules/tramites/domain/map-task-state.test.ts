import { describe, expect, it } from 'vitest'

import { getTaskStateBadge, isTaskClosed, mapTaskStateLabel } from '@/src/modules/tramites/domain/map-task-state'

describe('getTaskStateBadge', () => {
  it('returns unknown/em-dash for an undefined state', () => {
    expect(getTaskStateBadge(undefined)).toEqual({ label: '—', variant: 'unknown' })
  })

  it.each(['02_changes_requested'])('classifies "%s" as changesRequested', (state) => {
    expect(getTaskStateBadge(state).variant).toBe('changesRequested')
  })

  it.each(['01_in_progress', '03_approved', '04_waiting_normal'])(
    'classifies "%s" as inProgress',
    (state) => {
      expect(getTaskStateBadge(state).variant).toBe('inProgress')
    }
  )

  it.each(['1_done', 'done'])('classifies "%s" as done', (state) => {
    expect(getTaskStateBadge(state).variant).toBe('done')
  })

  it.each(['1_canceled', 'canceled', 'cancelled'])('classifies "%s" as canceled', (state) => {
    expect(getTaskStateBadge(state).variant).toBe('canceled')
  })

  it('an unrecognized state falls back to "unknown" with the raw state as a human label (underscores -> spaces)', () => {
    expect(getTaskStateBadge('05_some_future_odoo_stage')).toEqual({
      label: '05 some future odoo stage',
      variant: 'unknown',
    })
  })
})

describe('mapTaskStateLabel', () => {
  it('returns undefined (not the em-dash) for an undefined state — distinguishes "no state" from "unknown-but-present" for callers', () => {
    expect(mapTaskStateLabel(undefined)).toBeUndefined()
  })

  it('returns the real label for a known state', () => {
    expect(mapTaskStateLabel('done')).not.toBe('—')
  })
})

describe('isTaskClosed', () => {
  it('is false for undefined', () => {
    expect(isTaskClosed(undefined)).toBe(false)
  })

  it.each(['1_done', 'done', '1_canceled', 'canceled', 'cancelled'])(
    '"%s" is closed',
    (state) => {
      expect(isTaskClosed(state)).toBe(true)
    }
  )

  it.each(['01_in_progress', '03_approved', '04_waiting_normal', '02_changes_requested', 'anything_else'])(
    '"%s" is NOT closed',
    (state) => {
      expect(isTaskClosed(state)).toBe(false)
    }
  )
})
