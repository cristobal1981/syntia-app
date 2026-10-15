import { describe, expect, it } from 'vitest'

import { isValidIsoDate } from '@/lib/validation/date'

describe('isValidIsoDate', () => {
  it.each(['2026-01-01', '2026-02-28', '2024-02-29', '2026-12-31', '1990-07-15'])(
    'acepta %s',
    (value) => {
      expect(isValidIsoDate(value)).toBe(true)
    }
  )

  it.each([
    '2026-02-31',
    '2026-02-29',
    '2023-02-29',
    '2026-04-31',
    '2026-06-31',
    '2026-13-01',
    '2026-00-10',
    '2026-01-00',
    '2026-01-32',
  ])('rechaza la fecha imposible %s (new Date la desplazaría al mes siguiente)', (value) => {
    expect(isValidIsoDate(value)).toBe(false)
  })

  it.each(['', '2026-1-1', '26-01-01', '2026/01/01', '2026-01-01T00:00:00', ' 2026-01-01', '2026-01-011'])(
    'rechaza el formato %j',
    (value) => {
      expect(isValidIsoDate(value)).toBe(false)
    }
  )

  it('los años bisiestos se distinguen: 2000 sí, 1900 no', () => {
    expect(isValidIsoDate('2000-02-29')).toBe(true)
    expect(isValidIsoDate('1900-02-29')).toBe(false)
  })
})
