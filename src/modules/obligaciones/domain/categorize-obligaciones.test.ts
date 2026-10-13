import { describe, expect, it } from 'vitest'

import {
  attachObligacionDeadlineInfo,
  categorizeObligaciones,
  type ObligacionListRowWithDeadline,
} from '@/src/modules/obligaciones/domain/categorize-obligaciones'
import type { ObligacionListRow } from '@/src/modules/obligaciones/domain/sort-obligaciones-list'

function baseRow(overrides: Partial<ObligacionListRow> = {}): ObligacionListRow {
  return {
    id: 1,
    name: 'Modelo 303 - Cliente',
    state: '01_in_progress',
    attachmentCount: 0,
    year: 2026,
    yearLabel: '2026',
    periodLabel: 'Trimestre 1',
    periodSortKey: [1, 1, 'trimestre 1'],
    ...overrides,
  }
}

function urgentRow(
  overrides: Partial<ObligacionListRowWithDeadline> = {}
): ObligacionListRowWithDeadline {
  return {
    ...baseRow(),
    deadline: new Date(2020, 0, 1),
    deadlineStatus: 'overdue',
    ...overrides,
  }
}

describe('attachObligacionDeadlineInfo', () => {
  it('resolves a far-past deadline as overdue for an open task', () => {
    const [result] = attachObligacionDeadlineInfo([
      baseRow({ name: 'Modelo 200 - Cliente', periodLabel: 'Anuales', year: 2000 }),
    ])

    expect(result.deadline).toEqual(new Date(2001, 6, 25, 23, 59, 59))
    expect(result.deadlineStatus).toBe('overdue')
  })

  it('returns status "none" when no window covers the period, regardless of task state', () => {
    const [result] = attachObligacionDeadlineInfo([
      baseRow({ periodLabel: 'Mensuales', state: '01_in_progress' }),
    ])

    expect(result.deadline).toBeNull()
    expect(result.deadlineStatus).toBe('none')
  })

  it('returns status "none" for a closed task even with a resolvable past deadline', () => {
    const [result] = attachObligacionDeadlineInfo([
      baseRow({
        name: 'Modelo 200 - Cliente',
        periodLabel: 'Anuales',
        year: 2000,
        state: '1_done',
      }),
    ])

    expect(result.deadlineStatus).toBe('none')
  })

  it('returns null deadline when the model code cannot be extracted from the name', () => {
    const [result] = attachObligacionDeadlineInfo([baseRow({ name: 'Algo raro - Cliente' })])

    expect(result.deadline).toBeNull()
    expect(result.deadlineStatus).toBe('none')
  })
})

describe('categorizeObligaciones', () => {
  it('buckets a closed task into closedByYear, never into urgent/pending regardless of deadline status', () => {
    const result = categorizeObligaciones([
      urgentRow({ id: 1, state: '1_done', deadlineStatus: 'none', deadline: null }),
    ])

    expect(result.urgent).toEqual([])
    expect(result.pending).toEqual([])
    expect(result.closedByYear).toEqual([
      { year: 2026, yearLabel: '2026', rows: expect.any(Array) },
    ])
    expect(result.closedByYear[0].rows).toHaveLength(1)
  })

  it('buckets overdue and dueSoon open tasks into urgent', () => {
    const result = categorizeObligaciones([
      urgentRow({ id: 1, deadlineStatus: 'overdue' }),
      urgentRow({ id: 2, deadlineStatus: 'dueSoon' }),
    ])

    expect(result.urgent.map((row) => row.id)).toEqual([1, 2])
    expect(result.pending).toEqual([])
    expect(result.closedByYear).toEqual([])
  })

  it('buckets onTrack and "none" open tasks into pending', () => {
    const result = categorizeObligaciones([
      urgentRow({ id: 1, deadlineStatus: 'onTrack' }),
      urgentRow({ id: 2, deadlineStatus: 'none', deadline: null }),
    ])

    expect(result.pending.map((row) => row.id)).toEqual([1, 2])
    expect(result.urgent).toEqual([])
  })

  it('sorts urgent rows by deadline ascending — overdue (earlier deadlines) before dueSoon', () => {
    const result = categorizeObligaciones([
      urgentRow({ id: 1, deadline: new Date(2026, 9, 11) }), // dueSoon, +5 days
      urgentRow({ id: 2, deadline: new Date(2026, 8, 1) }), // overdue, oldest
      urgentRow({ id: 3, deadline: new Date(2026, 9, 1) }), // overdue, more recent
    ])

    expect(result.urgent.map((row) => row.id)).toEqual([2, 3, 1])
  })

  it('groups closed rows by fiscal year and sorts the groups most-recent-year first', () => {
    const result = categorizeObligaciones([
      urgentRow({ id: 1, state: '1_done', year: 2024, yearLabel: '2024' }),
      urgentRow({ id: 2, state: '1_done', year: 2026, yearLabel: '2026' }),
      urgentRow({ id: 3, state: 'canceled', year: 2025, yearLabel: '2025' }),
      urgentRow({ id: 4, state: '1_done', year: 2026, yearLabel: '2026' }),
    ])

    expect(result.closedByYear.map((group) => group.year)).toEqual([2026, 2025, 2024])
    expect(result.closedByYear[0].rows.map((row) => row.id)).toEqual([2, 4])
  })
})
