import { describe, expect, it } from 'vitest'
import { isValidVat } from '@/lib/validation/vat'

describe('isValidVat', () => {
  it.each([
    '12345678Z', // NIF
    'X1234567L', // NIE
    'Y1234567X',
    'Z1234567R',
    'A12345674', // CIF con dígito (entidad que exige dígito)
    'B12345674',
    'N1234567D', // entidad que exige letra
    'P1234567D',
    'W0000000J',
    'C12345674', // entidad que admite ambos
    'C1234567D',
    'A28015865', // CIF real publicado (Telefónica)
    'A39000013', // CIF real publicado (Santander)
  ])('acepta %s', (v) => expect(isValidVat(v)).toBe(true))

  it('normaliza minúsculas, espacios y recorte', () => {
    expect(isValidVat('  b 1234567 4 ')).toBe(true)
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

  it.each([
    ['letra de NIF incorrecta', '12345678A'],
    ['letra de NIE incorrecta', 'X1234567A'],
    ['dígito de control de CIF incorrecto', 'A12345670'],
    ['A exige dígito: con letra no vale', 'A1234567D'],
    ['B exige dígito: con letra no vale', 'B1234567D'],
    ['N exige letra: con dígito no vale', 'N12345674'],
    ['W exige letra: con dígito no vale', 'W00000000'],
    ['entidad mixta con letra de otro valor', 'C1234567A'],
    ['entidad mixta con dígito de otro valor', 'C12345670'],
  ])('REGRESIÓN: %s', (_label, v) => {
    expect(isValidVat(v)).toBe(false)
  })
})
