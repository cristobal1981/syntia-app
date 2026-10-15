import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { taxCalendar, type TaxCalendarWindow } from '@/content/tax-calendar'

import {
  getDaysUntilObligacionDeadline,
  getObligacionDeadlineStatus,
  isObligacionDueWithin,
  OBLIGACION_REMINDER_DAYS_AHEAD,
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

  it('resolves Trimestre 4 for IVA, pagos fraccionados del IRPF and 349 (AEAT) to the 30th, fiscal year + 1', () => {
    for (const modelCode of ['303', '309', '130', '131', '349']) {
      expect(resolveObligacionDeadline(modelCode, 'Trimestre 4', 2026)).toEqual(
        new Date(2027, 0, 30, 23, 59, 59)
      )
    }
  })

  it('resolves Trimestre 4 for the IGIC (ATC, 420/421) and the ventanilla única (369) to the 31st', () => {
    for (const modelCode of ['420', '421', '369']) {
      expect(resolveObligacionDeadline(modelCode, 'Trimestre 4', 2026)).toEqual(
        new Date(2027, 0, 31, 23, 59, 59)
      )
    }
  })

  it('resolves Trimestre 4 for retenciones (111, 115, 123, 216) to the 20th — no plazo ampliado', () => {
    for (const modelCode of ['111', '115', '123', '216']) {
      expect(resolveObligacionDeadline(modelCode, 'Trimestre 4', 2026)).toEqual(
        new Date(2027, 0, 20, 23, 59, 59)
      )
    }
  })

  it('REGRESIÓN: 130 y 131 acaban el 4T el 30 de enero, no el 20 (estaban con las retenciones)', () => {
    expect(resolveObligacionDeadline('130', 'Trimestre 4', 2026)?.getDate()).toBe(30)
    expect(resolveObligacionDeadline('131', 'Trimestre 4', 2026)?.getDate()).toBe(30)
  })

  it('REGRESIÓN: 349 acaba el 4T el 30 de enero, no el 20', () => {
    expect(resolveObligacionDeadline('349', 'Trimestre 4', 2026)).toEqual(
      new Date(2027, 0, 30, 23, 59, 59)
    )
    expect(resolveObligacionDeadline('349', 'Trimestre 3', 2026)).toEqual(
      new Date(2026, 9, 20, 23, 59, 59)
    )
  })

  it.each([
    ['303', 'Trimestre 1', new Date(2026, 3, 20)],
    ['309', 'Trimestre 2', new Date(2026, 6, 20)],
    ['216', 'Trimestre 3', new Date(2026, 9, 20)],
    ['421', 'Trimestre 1', new Date(2026, 3, 20)],
    ['420', 'Trimestre 2', new Date(2026, 6, 20)],
  ])('el modelo %s %s acaba el día 20 del mes siguiente', (modelCode, period, day) => {
    const result = resolveObligacionDeadline(modelCode, period, 2026)

    expect(result).toEqual(new Date(day.getFullYear(), day.getMonth(), 20, 23, 59, 59))
  })

  it('resolves 369 (OSS) to the last day of the month after each quarter', () => {
    expect(resolveObligacionDeadline('369', 'Trimestre 1', 2026)).toEqual(
      new Date(2026, 3, 30, 23, 59, 59)
    )
    expect(resolveObligacionDeadline('369', 'Trimestre 2', 2026)).toEqual(
      new Date(2026, 6, 31, 23, 59, 59)
    )
    expect(resolveObligacionDeadline('369', 'Trimestre 3', 2026)).toEqual(
      new Date(2026, 9, 31, 23, 59, 59)
    )
  })

  it('resolves 202 by «Periodo N»: abril, octubre y diciembre del propio año', () => {
    expect(resolveObligacionDeadline('202', 'Periodo 1', 2026)).toEqual(
      new Date(2026, 3, 20, 23, 59, 59)
    )
    expect(resolveObligacionDeadline('202', 'Periodo 2', 2026)).toEqual(
      new Date(2026, 9, 20, 23, 59, 59)
    )
    expect(resolveObligacionDeadline('202', 'Periodo 3', 2026)).toEqual(
      new Date(2026, 11, 20, 23, 59, 59)
    )
  })

  it('does not resolve 202 by quarter, as annual, nor an unknown «Periodo 4»', () => {
    expect(resolveObligacionDeadline('202', 'Trimestre 2', 2026)).toBeNull()
    expect(resolveObligacionDeadline('202', 'Anuales', 2026)).toBeNull()
    expect(resolveObligacionDeadline('202', 'Periodo 4', 2026)).toBeNull()
  })

  it('resolves 390 (resumen anual del IVA) to the 30th and the other resúmenes to the 31st, fiscal year + 1', () => {
    expect(resolveObligacionDeadline('390', 'Anuales', 2026)).toEqual(
      new Date(2027, 0, 30, 23, 59, 59)
    )
    for (const modelCode of ['190', '180', '193', '296', '182', '184', '233', '425']) {
      expect(resolveObligacionDeadline(modelCode, 'Anuales', 2026)).toEqual(
        new Date(2027, 0, 31, 23, 59, 59)
      )
    }
  })

  it('resolves 415 (IGIC, operaciones con terceros) with 347 to the end of February', () => {
    expect(resolveObligacionDeadline('415', 'Anuales', 2026)).toEqual(
      new Date(2027, 1, 28, 23, 59, 59)
    )
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

describe('coherencia del calendario', () => {
  it('ningún modelo está en dos ventanas del mismo trimestre ni del mismo periodo', () => {
    const seen = new Map<string, string>()
    const windows: readonly TaxCalendarWindow[] = taxCalendar.windows

    for (const window of windows) {
      for (const code of window.modelCodes) {
        const slots = [
          window.quarter !== undefined ? `T${window.quarter}` : null,
          window.period !== undefined ? `P${window.period}` : null,
        ].filter((slot): slot is string => slot !== null)

        for (const slot of slots) {
          const key = `${code}:${slot}`
          expect(seen.get(key), `${code} repetido en ${slot}: ${seen.get(key)} y ${window.id}`).toBeUndefined()
          seen.set(key, window.id)
        }
      }
    }
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

describe('time-of-day and boundaries (fixed clock)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Tarde del 15 de abril: la hora no debe alterar el conteo de días.
    vi.setSystemTime(new Date(2026, 3, 15, 18, 45, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts calendar days ignoring time of day on both sides', () => {
    expect(getDaysUntilObligacionDeadline(new Date(2026, 3, 15, 0, 0, 0))).toBe(0)
    expect(getDaysUntilObligacionDeadline(new Date(2026, 3, 15, 23, 59, 59))).toBe(0)
    expect(getDaysUntilObligacionDeadline(new Date(2026, 3, 16, 0, 0, 1))).toBe(1)
    expect(getDaysUntilObligacionDeadline(new Date(2026, 3, 14, 23, 59, 59))).toBe(-1)
    expect(getDaysUntilObligacionDeadline(new Date(2026, 3, 20, 23, 59, 59))).toBe(5)
  })

  it('does not mutate the deadline passed in', () => {
    const deadline = new Date(2026, 3, 20, 23, 59, 59)
    const before = deadline.getTime()
    getDaysUntilObligacionDeadline(deadline)
    expect(deadline.getTime()).toBe(before)
  })

  it('isObligacionDueWithin: boundaries 0, maxDays and maxDays+1', () => {
    expect(isObligacionDueWithin(new Date(2026, 3, 14, 23, 59, 59), 5)).toBe(false)
    expect(isObligacionDueWithin(new Date(2026, 3, 15, 23, 59, 59), 5)).toBe(true)
    expect(isObligacionDueWithin(new Date(2026, 3, 20, 23, 59, 59), 5)).toBe(true)
    expect(isObligacionDueWithin(new Date(2026, 3, 21, 0, 0, 0), 5)).toBe(false)
    expect(isObligacionDueWithin(new Date(2026, 3, 15), 0)).toBe(true)
    expect(isObligacionDueWithin(new Date(2026, 3, 16), 0)).toBe(false)
  })

  describe('getObligacionDeadlineStatus', () => {
    it('returns none without deadline', () => {
      expect(getObligacionDeadlineStatus(null, false)).toBe('none')
    })

    it('returns none when closed, even if overdue or due soon', () => {
      expect(getObligacionDeadlineStatus(new Date(2026, 3, 1), true)).toBe('none')
      expect(getObligacionDeadlineStatus(new Date(2026, 3, 16), true)).toBe('none')
    })

    it('overdue only when strictly before today; today is dueSoon', () => {
      expect(getObligacionDeadlineStatus(new Date(2026, 3, 14, 23, 59, 59), false)).toBe('overdue')
      expect(getObligacionDeadlineStatus(new Date(2026, 3, 15, 0, 0, 0), false)).toBe('dueSoon')
    })

    it('dueSoon up to REMINDER_DAYS_AHEAD inclusive, onTrack the day after', () => {
      expect(getObligacionDeadlineStatus(new Date(2026, 3, 20, 23, 59, 59), false)).toBe('dueSoon')
      expect(getObligacionDeadlineStatus(new Date(2026, 3, 21, 0, 0, 0), false)).toBe('onTrack')
      expect(getObligacionDeadlineStatus(new Date(2026, 5, 1), false)).toBe('onTrack')
    })
  })
})

describe('OBLIGACION_REMINDER_DAYS_AHEAD', () => {
  it('keeps the portal "vence pronto" window at 5 days', () => {
    expect(OBLIGACION_REMINDER_DAYS_AHEAD).toBe(5)
  })
})
