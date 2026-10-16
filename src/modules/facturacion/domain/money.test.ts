import { describe, expect, it } from 'vitest'

import { formatCents, parseAmountToCents, percentOfCents } from '@/src/modules/facturacion/domain/money'

describe('parseAmountToCents', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1,5', 150],
    ['12.5', 1250],
    ['12.50', 1250],
    ['1.234', 123400],
    ['1.234.567', 123456700],
    ['1,234.56', 123456],
    ['0,99', 99],
    ['100', 10000],
    ['  45,00 € ', 4500],
    ['-12,30', -1230],
  ])('%s → %d céntimos', (raw, cents) => {
    expect(parseAmountToCents(raw)).toBe(cents)
  })

  it.each(['', 'abc', '12,3x', '€', '.', ','])('rechaza «%s»', (raw) => {
    expect(parseAmountToCents(raw)).toBeNull()
  })
})

describe('percentOfCents', () => {
  it('calcula el IGIC general y redondea al céntimo', () => {
    expect(percentOfCents(10000, 7)).toBe(700)
    expect(percentOfCents(1234, 7)).toBe(86)
  })

  it('admite tipos con decimales como el 9,5 %', () => {
    expect(percentOfCents(10000, 9.5)).toBe(950)
    expect(percentOfCents(1001, 9.5)).toBe(95)
  })

  it('es simétrico con importes negativos (el abono es exactamente el negativo)', () => {
    for (const cents of [1, 5, 1001, 1234, 99999]) {
      for (const percent of [3, 7, 9.5, 15, 21]) {
        expect(percentOfCents(-cents, percent), `${cents} @ ${percent}`).toBe(-percentOfCents(cents, percent))
      }
    }
  })

  it('0 % da 0', () => {
    expect(percentOfCents(99999, 0)).toBe(0)
  })
})

describe('formatCents', () => {
  const normalize = (value: string) => value.replace(/\u00a0/g, ' ')

  it('agrupa los miles también en cifras de cuatro dígitos', () => {
    expect(normalize(formatCents(418850))).toBe('4.188,50 €')
    expect(normalize(formatCents(123456789))).toBe('1.234.567,89 €')
  })

  it('formatea céntimos, cero y negativos', () => {
    expect(normalize(formatCents(5))).toBe('0,05 €')
    expect(normalize(formatCents(0))).toBe('0,00 €')
    expect(normalize(formatCents(-1250))).toBe('-12,50 €')
  })
})
