import { describe, expect, it } from 'vitest'

import {
  flattenObligacionesYear,
  sortObligacionListRows,
  type ObligacionListRow,
} from '@/src/modules/obligaciones/domain/sort-obligaciones-list'
import type { ObligacionYear } from '@/src/modules/obligaciones/domain/types'

describe('flattenObligacionesYear', () => {
  const year: ObligacionYear = {
    year: 2026,
    label: '2026',
    periods: [
      {
        key: 'mensuales',
        label: 'Mensuales',
        tasks: [
          { id: 1, name: 'Marzo - Cliente', state: 'done', attachmentCount: 2 },
          { id: 2, name: 'Abril - Cliente', state: '01_in_progress', attachmentCount: 0 },
        ],
      },
      {
        key: 'anuales',
        label: 'Anuales',
        tasks: [{ id: 3, name: 'Modelo 100 - Cliente', state: 'done', attachmentCount: 1 }],
      },
    ],
  }

  it('flattens every task across every period into one row array, carrying year/period metadata down onto each row', () => {
    const rows = flattenObligacionesYear(year)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ id: 1, year: 2026, yearLabel: '2026', periodLabel: 'Marzo' })
    expect(rows[2]).toMatchObject({ id: 3, periodLabel: 'Anuales' })
  })

  it('an empty year (no periods) flattens to an empty array', () => {
    expect(flattenObligacionesYear({ year: 2026, label: '2026', periods: [] })).toEqual([])
  })
})

function row(overrides: Partial<ObligacionListRow>): ObligacionListRow {
  return {
    id: 1,
    name: 'Modelo 100 - Cliente',
    attachmentCount: 0,
    year: 2026,
    yearLabel: '2026',
    periodLabel: 'Anuales',
    periodSortKey: [0, 0, 'anuales'],
    ...overrides,
  }
}

describe('sortObligacionListRows — column: period', () => {
  it('asc uses the fiscal priority sort key, not alphabetical', () => {
    const rows = [
      row({ id: 1, periodSortKey: [2, 3, 'marzo'] }),
      row({ id: 2, periodSortKey: [0, 0, 'anual'] }),
      row({ id: 3, periodSortKey: [1, 1, 'trimestre 1'] }),
    ]
    expect(sortObligacionListRows(rows, 'period', 'asc').map((r) => r.id)).toEqual([2, 3, 1])
  })

  it('desc reverses it', () => {
    const rows = [
      row({ id: 1, periodSortKey: [2, 3, 'marzo'] }),
      row({ id: 2, periodSortKey: [0, 0, 'anual'] }),
    ]
    expect(sortObligacionListRows(rows, 'period', 'desc').map((r) => r.id)).toEqual([1, 2])
  })
})

describe('sortObligacionListRows — column: model', () => {
  it('sorts by the formatted model label (Modelo N), not the raw task name', () => {
    const rows = [
      row({ id: 1, name: 'Modelo 303 - Cliente B' }),
      row({ id: 2, name: 'Modelo 100 - Cliente A' }),
    ]
    expect(sortObligacionListRows(rows, 'model', 'asc').map((r) => r.id)).toEqual([2, 1])
  })
})

describe('sortObligacionListRows — column: state', () => {
  // done=0, in-progress/unknown=1, canceled=2 — a completed obligation ranks
  // before an open one, and a canceled one ranks last of all.
  it('orders done < in-progress < canceled (asc)', () => {
    const rows = [
      row({ id: 1, state: 'canceled' }),
      row({ id: 2, state: '01_in_progress' }),
      row({ id: 3, state: 'done' }),
    ]
    expect(sortObligacionListRows(rows, 'state', 'asc').map((r) => r.id)).toEqual([3, 2, 1])
  })

  it('an unset state ranks with "in progress" (rank 1), not with "done"', () => {
    const rows = [row({ id: 1, state: undefined }), row({ id: 2, state: 'done' })]
    expect(sortObligacionListRows(rows, 'state', 'asc').map((r) => r.id)).toEqual([2, 1])
  })
})

describe('sortObligacionListRows — column: documents', () => {
  it('sorts by attachmentCount numerically', () => {
    const rows = [row({ id: 1, attachmentCount: 5 }), row({ id: 2, attachmentCount: 1 })]
    expect(sortObligacionListRows(rows, 'documents', 'asc').map((r) => r.id)).toEqual([2, 1])
  })
})

describe('sortObligacionListRows — tie-break', () => {
  it('when the primary column ties, falls back to period order instead of leaving original order unstable', () => {
    const rows = [
      row({ id: 1, attachmentCount: 0, periodSortKey: [2, 3, 'marzo'] }),
      row({ id: 2, attachmentCount: 0, periodSortKey: [0, 0, 'anual'] }),
    ]
    expect(sortObligacionListRows(rows, 'documents', 'asc').map((r) => r.id)).toEqual([2, 1])
  })
})

describe('sortObligacionListRows — defensive copy', () => {
  it('does not mutate the input array', () => {
    const rows = [row({ id: 1, attachmentCount: 2 }), row({ id: 2, attachmentCount: 1 })]
    const original = [...rows]
    sortObligacionListRows(rows, 'documents', 'asc')
    expect(rows).toEqual(original)
  })
})
