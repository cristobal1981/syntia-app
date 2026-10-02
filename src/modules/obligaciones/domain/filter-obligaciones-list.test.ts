import { describe, expect, it } from 'vitest'

import { filterObligacionListRows } from '@/src/modules/obligaciones/domain/filter-obligaciones-list'
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

describe('filterObligacionListRows — selectedModel', () => {
  it('filters to rows whose formatted model label matches exactly (case-insensitive)', () => {
    const rows = [
      row({ id: 1, name: 'Modelo 100 - Cliente' }),
      row({ id: 2, name: 'Modelo 303 - Cliente' }),
    ]
    expect(filterObligacionListRows(rows, '', 'modelo 100').map((r) => r.id)).toEqual([1])
  })

  it('an empty/whitespace selectedModel applies no model filter', () => {
    const rows = [row({ id: 1 }), row({ id: 2, name: 'Modelo 303 - Cliente' })]
    expect(filterObligacionListRows(rows, '', '   ').map((r) => r.id)).toEqual([1, 2])
  })
})

describe('filterObligacionListRows — free-text query', () => {
  it('an empty query returns all (model-filtered) rows unchanged', () => {
    const rows = [row({ id: 1 }), row({ id: 2 })]
    expect(filterObligacionListRows(rows, '   ').map((r) => r.id)).toEqual([1, 2])
  })

  it('matches against the period label', () => {
    const rows = [row({ id: 1, periodLabel: 'Marzo' }), row({ id: 2, periodLabel: 'Abril' })]
    expect(filterObligacionListRows(rows, 'marzo').map((r) => r.id)).toEqual([1])
  })

  it('matches against the full raw task name', () => {
    const rows = [row({ id: 1, name: 'Modelo 100 - Juan Pérez' }), row({ id: 2, name: 'Modelo 100 - Ana López' })]
    expect(filterObligacionListRows(rows, 'juan').map((r) => r.id)).toEqual([1])
  })

  it('query matching is accent-insensitive (via normalizeGuideSearchText)', () => {
    const rows = [row({ id: 1, periodLabel: 'Período' })]
    expect(filterObligacionListRows(rows, 'periodo').map((r) => r.id)).toEqual([1])
  })

  it('also matches via the fiscal model guide (e.g. "irpf" finds Modelo 100 even though neither the period label nor the task name contains it)', () => {
    const rows = [
      row({ id: 1, name: 'Modelo 100 - Cliente', periodLabel: 'Anuales' }),
      row({ id: 2, name: 'Modelo 303 - Cliente', periodLabel: 'Trimestre 1' }),
    ]
    expect(filterObligacionListRows(rows, 'irpf').map((r) => r.id)).toEqual([1])
  })

  it('model filter and text query compose (AND, not OR)', () => {
    const rows = [
      row({ id: 1, name: 'Modelo 100 - Cliente', periodLabel: 'Marzo' }),
      row({ id: 2, name: 'Modelo 100 - Cliente', periodLabel: 'Abril' }),
      row({ id: 3, name: 'Modelo 303 - Cliente', periodLabel: 'Marzo' }),
    ]
    expect(filterObligacionListRows(rows, 'marzo', 'Modelo 100').map((r) => r.id)).toEqual([1])
  })
})
