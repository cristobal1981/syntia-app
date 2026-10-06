import { describe, expect, it } from 'vitest'

import {
  getDaysUntilObligacionDeadline,
  isObligacionDueWithin,
  resolveObligacionDeadline,
} from '@/src/modules/obligaciones/domain/resolve-obligacion-deadline'

describe('resolveObligacionDeadline', () => {
  it('resolves Trimestre 1 to the t1 window end, same fiscal year', () => {
    const result = resolveObligacionDeadline('303', 'Trimestre 1', 2026)

    expect(result).toEqual(new Date(2026, 3, 20, 23, 59, 59))
  })

  it('resolves Trimestre 2 to the t2 window end, same fiscal year', () => {
    const result = resolveObligacionDeadline('111', 'Trimestre 2', 2026)

    expect(result).toEqual(new Date(2026, 6, 20, 23, 59, 59))
  })

  it('resolves Trimestre 3 to the t3 window end, same fiscal year', () => {
    const result = resolveObligacionDeadline('130', 'Trimestre 3', 2026)

    expect(result).toEqual(new Date(2026, 9, 20, 23, 59, 59))
  })

  it('resolves Trimestre 4 to the t4 window end, fiscal year + 1 (se declara en enero siguiente)', () => {
    const result = resolveObligacionDeadline('303', 'Trimestre 4', 2026)

    expect(result).toEqual(new Date(2027, 0, 30, 23, 59, 59))
  })

  it('resolves an annual model (390) to the resumenes-anuales window, fiscal year + 1', () => {
    const result = resolveObligacionDeadline('390', 'Anuales', 2026)

    expect(result).toEqual(new Date(2027, 0, 31, 23, 59, 59))
  })

  it('resolves model 347 to the feb-347 window, fiscal year + 1', () => {
    const result = resolveObligacionDeadline('347', 'Anuales', 2026)

    expect(result).toEqual(new Date(2027, 1, 28, 23, 59, 59))
  })

  it('resolves model 100 (Renta) to the renta window, fiscal year + 1', () => {
    const result = resolveObligacionDeadline('100', 'Anuales', 2026)

    expect(result).toEqual(new Date(2027, 5, 30, 23, 59, 59))
  })

  it('resolves model 200 (Sociedades) to the sociedades window, fiscal year + 1', () => {
    const result = resolveObligacionDeadline('200', 'Anuales', 2026)

    expect(result).toEqual(new Date(2027, 6, 25, 23, 59, 59))
  })

  it('returns null for Mensuales periods — no window covers them yet', () => {
    expect(resolveObligacionDeadline('111', 'Mensuales', 2026)).toBeNull()
    expect(resolveObligacionDeadline('111', 'Enero', 2026)).toBeNull()
  })

  it('returns null for "Periodo N" style periods', () => {
    expect(resolveObligacionDeadline('349', 'Periodo 3', 2026)).toBeNull()
  })

  it('returns null when the model is not covered by the matching quarter window', () => {
    expect(resolveObligacionDeadline('999', 'Trimestre 1', 2026)).toBeNull()
  })

  it('returns null when the model is not covered by any annual window', () => {
    expect(resolveObligacionDeadline('999', 'Anuales', 2026)).toBeNull()
  })

  it('returns null for an out-of-range quarter number', () => {
    expect(resolveObligacionDeadline('303', 'Trimestre 5', 2026)).toBeNull()
  })
})

describe('getDaysUntilObligacionDeadline / isObligacionDueWithin', () => {
  function daysFromToday(days: number): Date {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date
  }

  it('counts days to a future deadline', () => {
    expect(getDaysUntilObligacionDeadline(daysFromToday(5))).toBe(5)
  })

  it('counts 0 for a deadline that is today', () => {
    expect(getDaysUntilObligacionDeadline(daysFromToday(0))).toBe(0)
  })

  it('counts negative days for a deadline already passed', () => {
    expect(getDaysUntilObligacionDeadline(daysFromToday(-1))).toBe(-1)
  })

  it('is due within the window when days are between 0 and maxDays inclusive', () => {
    expect(isObligacionDueWithin(daysFromToday(5), 5)).toBe(true)
    expect(isObligacionDueWithin(daysFromToday(0), 5)).toBe(true)
  })

  it('is not due within the window when days exceed maxDays', () => {
    expect(isObligacionDueWithin(daysFromToday(6), 5)).toBe(false)
  })

  it('is not due within the window once the deadline has passed', () => {
    expect(isObligacionDueWithin(daysFromToday(-1), 5)).toBe(false)
  })
})
