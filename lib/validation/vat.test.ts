import { describe, expect, it } from 'vitest'
import { isValidVat } from '@/lib/validation/vat'

describe('isValidVat', () => {
  it.each([
    '12345678Z', // NIF
    'X1234567L', // NIE
    'Y1234567X',
    'Z1234567R',
    'A12345674', // CIF con dígito
    'B1234567J', // CIF con letra A-J
    'W0000000A',
    'N1234567A',
  ])('acepta %s', (v) => expect(isValidVat(v)).toBe(true))

  it('normaliza minúsculas, espacios y recorte', () => {
    expect(isValidVat('  b 1234567 j ')).toBe(true)
    expect(isValidVat('12345678 z')).toBe(true)
  })

  it.each([
    '',
    '   ',
    '1234567Z',
    '123456789Z',
    'I1234567A', // letra inicial no permitida en CIF
    'O1234567A',
    'T1234567A',
    'K1234567A',
    'L1234567A',
    'M1234567A',
    'X12345674', // NIE termina en dígito
    'A1234567K', // CIF: última letra fuera de A-J
    'A123456', // corto
    'A123456789', // largo
    'ES12345678Z', // prefijo de país no admitido
    'A1234567-4',
  ])('rechaza %j', (v) => expect(isValidVat(v)).toBe(false))

  it('anclado: no acepta texto alrededor', () => {
    expect(isValidVat('xA12345674')).toBe(false)
    expect(isValidVat('A12345674x')).toBe(false)
  })

  it('NO comprueba dígito/letra de control (solo formato)', () => {
    expect(isValidVat('A12345670')).toBe(true)
  })
})
