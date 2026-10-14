import { describe, expect, it } from 'vitest'
import { dniControlLetter, isValidDni, normalizeDni } from '@/lib/validation/dni'

describe('normalizeDni', () => {
  it('recorta, pasa a mayúsculas y elimina espacios internos', () => {
    expect(normalizeDni('  12345678z ')).toBe('12345678Z')
    expect(normalizeDni('x 1234567 l')).toBe('X1234567L')
    expect(normalizeDni('1234 5678\tz')).toBe('12345678Z')
  })
})

describe('isValidDni', () => {
  it.each(['12345678Z', '00000000T', 'X1234567L', 'Y1234567X', 'Z1234567R'])(
    'acepta %s',
    (v) => expect(isValidDni(v)).toBe(true)
  )

  it('normaliza antes de validar (minúsculas y espacios)', () => {
    expect(isValidDni(' 12345678z ')).toBe(true)
    expect(isValidDni('x 1234567 l')).toBe(true)
  })

  it.each([
    '',
    '   ',
    '1234567Z', // 7 dígitos
    '123456789Z', // 9 dígitos
    '12345678', // sin letra
    '12345678ZZ',
    'A1234567L', // prefijo no XYZ
    'W1234567L',
    'X123456L', // NIE corto
    'X12345678L', // NIE largo
    'XX234567L',
    '1234567XZ',
    '12345678-Z',
    '12345678Ñ',
  ])('rechaza %j', (v) => expect(isValidDni(v)).toBe(false))

  it('anclado: no acepta texto alrededor', () => {
    expect(isValidDni('a12345678Z')).toBe(false)
    expect(isValidDni('12345678Zb')).toBe(false)
    expect(isValidDni('12345678Z\n12345678Z')).toBe(false)
  })

  it('REGRESIÓN: comprueba la letra de control (la correcta de 12345678 es Z)', () => {
    expect(isValidDni('12345678Z')).toBe(true)
    expect(isValidDni('12345678A')).toBe(false)
    expect(isValidDni('12345678z')).toBe(true)
  })

  it('letra de control del NIE: X/Y/Z cuentan como 0/1/2', () => {
    expect(isValidDni('X1234567L')).toBe(true)
    expect(isValidDni('Y1234567X')).toBe(true)
    expect(isValidDni('Z1234567R')).toBe(true)
    expect(isValidDni('X1234567A')).toBe(false)
    expect(isValidDni('Y1234567L')).toBe(false)
  })

  it('el resto cero es T y el máximo (resto 22) es E', () => {
    expect(isValidDni('00000000T')).toBe(true)
    expect(isValidDni('00000000A')).toBe(false)
    expect(isValidDni('00000022E')).toBe(true)
  })

  it('dniControlLetter devuelve null si no hay formato', () => {
    expect(dniControlLetter('ABC')).toBeNull()
    expect(dniControlLetter('1234567Z')).toBeNull()
  })
})
