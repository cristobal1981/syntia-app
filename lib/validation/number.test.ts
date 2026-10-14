import { describe, expect, it } from 'vitest'

import { isValidPositiveDecimal } from '@/lib/validation/number'

describe('isValidPositiveDecimal (formato español)', () => {
  it.each(['1', '15', '1500', '1500,5', '1500,50', '0,5', '1.500', '1.500,50', '12.345.678,9'])(
    'acepta %s',
    (value) => {
      expect(isValidPositiveDecimal(value)).toBe(true)
    }
  )

  it.each([
    ['1.5', 'se leería como 15'],
    ['1500.50', 'se leería como 150050'],
    ['1.50', 'grupo de miles de 2 dígitos'],
    ['1.5000', 'grupo de miles de 4 dígitos'],
    ['.500', 'sin dígitos antes del punto'],
    ['1..500', 'puntos seguidos'],
    ['1,500,5', 'dos comas'],
    ['1,', 'coma sin decimales'],
    [',5', 'sin parte entera'],
    ['abc', 'no numérico'],
    ['-5', 'negativo'],
    ['0', 'cero no es positivo'],
    ['0,00', 'cero con decimales'],
    ['', 'vacío'],
  ])('rechaza %j (%s)', (value) => {
    expect(isValidPositiveDecimal(value)).toBe(false)
  })

  it('respeta el máximo de decimales (2 por defecto) y se puede cambiar', () => {
    expect(isValidPositiveDecimal('1,234')).toBe(false)
    expect(isValidPositiveDecimal('1,234', { maxFractionDigits: 3 })).toBe(true)
  })

  it('respeta el máximo de dígitos enteros', () => {
    expect(isValidPositiveDecimal('1234', { maxIntegerDigits: 3 })).toBe(false)
    expect(isValidPositiveDecimal('123', { maxIntegerDigits: 3 })).toBe(true)
  })

  it('ignora espacios alrededor', () => {
    expect(isValidPositiveDecimal('  1.500,25  ')).toBe(true)
  })
})
