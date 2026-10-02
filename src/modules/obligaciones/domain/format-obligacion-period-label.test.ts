import { describe, expect, it } from 'vitest'

import { formatObligacionPeriodLabel } from '@/src/modules/obligaciones/domain/format-obligacion-period-label'

describe('formatObligacionPeriodLabel', () => {
  it('a "Mensuales" container splits into the individual month found in the task name', () => {
    const result = formatObligacionPeriodLabel('Mensuales', 'Marzo - Cliente SL')
    expect(result.label).toBe('Marzo')
    expect(result.sortKey).toEqual([2, 3, 'marzo'])
  })

  it('"Mensual" (singular) container behaves the same as "Mensuales"', () => {
    const result = formatObligacionPeriodLabel('Mensual', 'Enero - Cliente SL')
    expect(result.label).toBe('Enero')
  })

  it('a monthly container whose task name has NO recognizable month falls back to the raw container label', () => {
    const result = formatObligacionPeriodLabel('Mensuales', 'Modelo 303 - Cliente SL')
    expect(result.label).toBe('Mensuales')
  })

  it('a non-monthly container (e.g. "Trimestre 1") is used as-is, task name is irrelevant', () => {
    const result = formatObligacionPeriodLabel('Trimestre 1', 'Marzo - Cliente SL')
    expect(result.label).toBe('Trimestre 1')
    expect(result.sortKey).toEqual([1, 1, 'trimestre 1'])
  })

  it('trims surrounding whitespace on the container label', () => {
    const result = formatObligacionPeriodLabel('  Anual  ', 'Cualquier cosa')
    expect(result.label).toBe('Anual')
  })
})
