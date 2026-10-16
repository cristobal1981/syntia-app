import { describe, expect, it } from 'vitest'

import { addDaysIso, daysBetweenIso, localIsoDate } from '@/src/modules/facturacion/domain/dates'

describe('addDaysIso', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-05-07', 30, '2026-06-06'],
    ['2026-05-07', 0, '2026-05-07'],
  ])('%s %+d días → %s', (date, days, expected) => {
    expect(addDaysIso(date, days)).toBe(expected)
  })
})

describe('daysBetweenIso', () => {
  it('cuenta días naturales, con signo', () => {
    expect(daysBetweenIso('2026-01-01', '2026-01-31')).toBe(30)
    expect(daysBetweenIso('2026-01-31', '2026-01-01')).toBe(-30)
    expect(daysBetweenIso('2026-05-07', '2026-05-07')).toBe(0)
  })

  it('cruza el cambio de hora sin perder ni ganar un día', () => {
    expect(daysBetweenIso('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetweenIso('2026-10-24', '2026-10-26')).toBe(2)
  })
})

describe('localIsoDate', () => {
  it('usa los componentes locales y rellena con ceros', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(localIsoDate(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31')
  })
})
