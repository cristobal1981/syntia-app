import { describe, expect, it } from 'vitest'
import { isValidPhone } from '@/lib/validation/phone'

describe('isValidPhone', () => {
  it('vacío o solo espacios es válido (opcional)', () => {
    expect(isValidPhone('')).toBe(true)
    expect(isValidPhone('   ')).toBe(true)
  })

  it.each([
    '612345678',
    '+34612345678',
    '+34 612 345 678',
    '612-345-678',
    '91 (1) 123 45 67',
    '91.123.45.67',
    '12345678', // mínimo: 1 + 7
    '  612345678  ',
  ])('acepta %j', (v) => expect(isValidPhone(v)).toBe(true))

  it.each([
    '1234567', // 7 caracteres: demasiado corto
    '+1234567',
    'abc',
    '61234567a',
    '+',
    '++34612345678',
    '+34+612345678',
    '(91) 123 45 67', // no puede empezar por paréntesis
  ])('rechaza %j', (v) =>
    expect(isValidPhone(v)).toBe(false)
  )

  it('debe empezar por dígito o +', () => {
    expect(isValidPhone('-612345678')).toBe(false)
    expect(isValidPhone(' (612345678')).toBe(false)
    expect(isValidPhone('.612345678')).toBe(false)
  })

  it('anclado: no acepta texto final', () => {
    expect(isValidPhone('612345678x')).toBe(false)
    expect(isValidPhone('x612345678')).toBe(false)
  })

  it('BUG documentado: \\s admite saltos de línea internos', () => {
    expect(isValidPhone('612345678\n612345678')).toBe(true)
  })
})
