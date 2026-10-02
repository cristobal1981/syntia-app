import { describe, expect, it } from 'vitest'

import { groupObligacionesByModel } from '@/src/modules/obligaciones/domain/group-obligaciones-by-model'
import type { ObligacionListRow } from '@/src/modules/obligaciones/domain/sort-obligaciones-list'

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

describe('groupObligacionesByModel', () => {
  it('groups rows by their formatted model label, merging rows from different clients/years under the same model', () => {
    const rows = [
      row({ id: 1, name: 'Modelo 303 - Cliente A' }),
      row({ id: 2, name: 'Modelo 100 - Cliente A' }),
      row({ id: 3, name: 'Modelo 303 - Cliente B' }),
    ]
    const groups = groupObligacionesByModel(rows)
    expect(groups.map((g) => g.modelLabel)).toEqual(['Modelo 100', 'Modelo 303'])
    expect(groups.find((g) => g.modelLabel === 'Modelo 303')?.entries.map((e) => e.id)).toEqual([
      1, 3,
    ])
  })

  it('entries within a group are sorted by period (fiscal priority), not insertion order', () => {
    const rows = [
      row({ id: 1, name: 'Modelo 303 - Cliente', periodSortKey: [1, 4, 'trimestre 4'] }),
      row({ id: 2, name: 'Modelo 303 - Cliente', periodSortKey: [1, 1, 'trimestre 1'] }),
    ]
    const group = groupObligacionesByModel(rows)[0]
    expect(group.entries.map((e) => e.id)).toEqual([2, 1])
  })

  it('groups themselves are sorted alphabetically by model label (not by model number)', () => {
    const rows = [row({ id: 1, name: 'Modelo 9 - Cliente' }), row({ id: 2, name: 'Algo - Cliente' })]
    expect(groupObligacionesByModel(rows).map((g) => g.modelLabel)).toEqual([
      'Algo',
      'Modelo 9',
    ])
  })

  it('an empty row list produces an empty group list', () => {
    expect(groupObligacionesByModel([])).toEqual([])
  })
})
