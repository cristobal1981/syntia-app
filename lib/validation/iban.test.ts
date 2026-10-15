import { describe, expect, it } from 'vitest'

import { isValidSpanishIban, maskIban, normalizeIban } from '@/lib/validation/iban'

const IBAN = 'ES9121000418450200051332'

describe('isValidSpanishIban', () => {
  it('acepta un IBAN español correcto con o sin espacios y en minúsculas', () => {
    expect(isValidSpanishIban(IBAN)).toBe(true)
    expect(isValidSpanishIban('ES91 2100 0418 4502 0005 1332')).toBe(true)
    expect(isValidSpanishIban(IBAN.toLowerCase())).toBe(true)
  })

  it('rechaza un dígito cambiado (mod 97)', () => {
    expect(isValidSpanishIban('ES9121000418450200051333')).toBe(false)
    expect(isValidSpanishIban('ES9221000418450200051332')).toBe(false)
  })

  it.each(['', 'ES91', 'FR1420041010050500013M02606', `${IBAN}0`, 'ES91210004184502000513A2'])(
    'rechaza %j',
    (value) => {
      expect(isValidSpanishIban(value)).toBe(false)
    }
  )
})

describe('normalizeIban', () => {
  it('quita espacios y pasa a mayúsculas', () => {
    expect(normalizeIban(' es91 2100 0418 ')).toBe('ES9121000418')
  })
})

describe('maskIban', () => {
  it('enseña solo los dos primeros y los cuatro últimos caracteres', () => {
    expect(maskIban(IBAN)).toBe('ES** **** **** **** 1332')
    expect(maskIban('ES91 2100 0418 4502 0005 1332')).toBe('ES** **** **** **** 1332')
  })

  it('REGRESIÓN: un valor demasiado corto no se devuelve tal cual (no se filtra entero)', () => {
    expect(maskIban('ES12345')).toBe('****')
    expect(maskIban('ES12345')).not.toContain('12345')
    expect(maskIban('AB')).toBe('****')
  })

  it('con exactamente 8 caracteres ya se enmascara por el camino normal', () => {
    expect(maskIban('ES123456')).toBe('ES** **** **** **** 3456')
  })
})
