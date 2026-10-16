import { describe, expect, it } from 'vitest'

import {
  completeCif,
  isValidSpanishTaxId,
  isValidTaxId,
  normalizeTaxId,
} from '@/src/modules/facturacion/domain/tax-id'

describe('normalizeTaxId', () => {
  it('pasa a mayúsculas y quita espacios, puntos y guiones', () => {
    expect(normalizeTaxId(' b-35.123 456 ')).toBe('B35123456')
  })
})

describe('isValidSpanishTaxId', () => {
  it.each(['12345678Z', 'X1234567L', 'A58818501'])('acepta %s', (value) => {
    expect(isValidSpanishTaxId(value)).toBe(true)
  })

  it('acepta el mismo CIF con separadores y minúsculas', () => {
    expect(isValidSpanishTaxId('a-58.818.501')).toBe(true)
  })

  it.each(['12345678A', 'A58818502', 'A58818500', 'B3512345', '', 'ZZZZZZZZZ', '99999999A'])(
    'rechaza %s',
    (value) => {
      expect(isValidSpanishTaxId(value)).toBe(false)
    }
  )

  it('completeCif produce CIF válidos para cada tipo de entidad', () => {
    for (const prefix of ['B3512345', 'A2801789', 'P3500001', 'Q2826000', 'N0032000', 'S4611001', 'G4800000', 'E3522233']) {
      const cif = completeCif(prefix)
      expect(isValidSpanishTaxId(cif), cif).toBe(true)
    }
  })

  it('en las sociedades (A, B, E, H) el control es un dígito; en P, Q, R, S, W y N, una letra', () => {
    expect(completeCif('B3512345')).toMatch(/\d$/)
    expect(completeCif('P3500001')).toMatch(/[A-J]$/)
    expect(completeCif('N0032000')).toMatch(/[A-J]$/)
  })

  it('un CIF con el control equivocado no vale aunque el formato sea correcto', () => {
    const valid = completeCif('B3512345')
    const wrong = valid.slice(0, -1) + String((Number(valid.slice(-1)) + 1) % 10)
    expect(isValidSpanishTaxId(wrong)).toBe(false)
  })
})

describe('isValidTaxId', () => {
  it('admite NIF-IVA de otros países de la UE', () => {
    expect(isValidTaxId('IE6388047V')).toBe(true)
    expect(isValidTaxId('FR12345678901')).toBe(true)
    expect(isValidTaxId('DE 123456789')).toBe(true)
  })

  it('un prefijo ES no se acepta como comunitario: tiene que ser un NIF español válido', () => {
    expect(isValidTaxId('ESB35123456')).toBe(false)
  })

  it('acepta los españoles válidos y rechaza basura', () => {
    expect(isValidTaxId('12345678Z')).toBe(true)
    expect(isValidTaxId('12')).toBe(false)
    expect(isValidTaxId('hola mundo')).toBe(false)
  })
})
