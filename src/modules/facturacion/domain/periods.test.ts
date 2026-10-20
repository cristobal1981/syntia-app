import { describe, expect, it } from 'vitest'

import {
  availableYears,
  filterByPeriod,
  isInPeriod,
  quarterOf,
  yearOf,
} from '@/src/modules/facturacion/domain/periods'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'

describe('quarterOf', () => {
  it.each([
    ['2026-01-01', 1],
    ['2026-03-31', 1],
    ['2026-04-01', 2],
    ['2026-06-30', 2],
    ['2026-07-01', 3],
    ['2026-09-30', 3],
    ['2026-10-01', 4],
    ['2026-12-31', 4],
  ])('%s → trimestre %d', (date, quarter) => {
    expect(quarterOf(date)).toBe(quarter)
  })
})

describe('isInPeriod / filterByPeriod', () => {
  it('un año completo incluye todos sus trimestres y excluye otros años', () => {
    expect(isInPeriod('2026-12-31', { year: 2026, quarter: null })).toBe(true)
    expect(isInPeriod('2025-12-31', { year: 2026, quarter: null })).toBe(false)
  })

  it('un trimestre solo incluye sus meses', () => {
    expect(isInPeriod('2026-04-01', { year: 2026, quarter: 2 })).toBe(true)
    expect(isInPeriod('2026-03-31', { year: 2026, quarter: 2 })).toBe(false)
    expect(isInPeriod('2025-05-10', { year: 2026, quarter: 2 })).toBe(false)
  })

  it('filtra las facturas de ejemplo por trimestre', () => {
    const q1 = filterByPeriod([...SAMPLE_INVOICES], { year: 2026, quarter: 1 })
    expect(q1.length).toBeGreaterThan(0)
    expect(q1.every((invoice) => yearOf(invoice.issueDate) === 2026 && quarterOf(invoice.issueDate) === 1)).toBe(true)
  })
})

describe('availableYears', () => {
  it('incluye el año de respaldo aunque no haya facturas y ordena de más reciente a más antiguo', () => {
    expect(availableYears([], 2026)).toEqual([2026])
    expect(availableYears([...SAMPLE_INVOICES], 2027)).toEqual([2027, 2026])
  })
})
