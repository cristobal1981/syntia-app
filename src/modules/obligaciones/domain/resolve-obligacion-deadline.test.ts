import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

  it('resolves Trimestre 4 for IVA/IGIC (303, 420, 425) to the extended 30th, fiscal year + 1', () => {
    expect(resolveObligacionDeadline('303', 'Trimestre 4', 2026)).toEqual(
      new Date(2027, 0, 30, 23, 59, 59)
    )
    expect(resolveObligacionDeadline('420', 'Trimestre 4', 2026)).toEqual(
      new Date(2027, 0, 30, 23, 59, 59)
    )
    expect(resolveObligacionDeadline('425', 'Trimestre 4', 2026)).toEqual(
      new Date(2027, 0, 30, 23, 59, 59)
    )
  })

  it('resolves Trimestre 4 for retenciones/pagos fraccionados (111, 115, 123, 130, 131, 349) to the 20th — no plazo ampliado', () => {
    for (const modelCode of ['111', '115', '123', '130', '131', '349']) {
      expect(resolveObligacionDeadline(modelCode, 'Trimestre 4', 2026)).toEqual(
        new Date(2027, 0, 20, 23, 59, 59)
      )
    }
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
