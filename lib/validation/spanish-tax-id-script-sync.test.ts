import { describe, expect, it } from 'vitest'

import {
  classifyStoredTaxId,
  isValidSpanishTaxId,
} from '@/scripts/lib/spanish-tax-id.mjs'
import { isValidVat } from '@/lib/validation/vat'

/**
 * El script de auditoría lleva su propia copia de la regla (Node puro). Este
 * test la contrasta con la de la app sobre muchos valores para que no diverjan.
 */
function sampleValues(): string[] {
  const out: string[] = []
  const letters = 'ABCDEFGHJNPQRSUVW'
  for (let n = 0; n < 60; n += 1) {
    const digits = String(1234567 + n * 7919).padStart(7, '0').slice(0, 7)
    for (const control of ['0', '1', '4', '5', 'A', 'D', 'J', 'Z']) {
      for (const first of letters) out.push(`${first}${digits}${control}`)
    }
    for (const control of 'TRWAGMYFPDXBNJZSQVHLCKE') {
      out.push(`${String(10000000 + n * 137).padStart(8, '0')}${control}`)
      out.push(`X${digits}${control}`, `Y${digits}${control}`, `Z${digits}${control}`)
    }
  }
  return out
}

describe('script de auditoría: misma regla que isValidVat', () => {
  it('coincide con isValidVat en todos los valores de muestra', () => {
    const samples = sampleValues()
    expect(samples.length).toBeGreaterThan(8000)

    const mismatches = samples.filter((value) => isValidSpanishTaxId(value) !== isValidVat(value))

    expect(mismatches).toEqual([])
  })

  it('coincide con la normalización (minúsculas y espacios)', () => {
    expect(isValidSpanishTaxId('  b 1234567 4 ')).toBe(isValidVat('  b 1234567 4 '))
    expect(isValidSpanishTaxId('12345678 z')).toBe(true)
  })
})

describe('classifyStoredTaxId', () => {
  it('válido, con y sin prefijo ES', () => {
    expect(classifyStoredTaxId('12345678Z').status).toBe('ok')
    expect(classifyStoredTaxId('ES12345678Z')).toMatchObject({ status: 'ok', normalized: '12345678Z' })
    expect(classifyStoredTaxId('ESB12345674')).toMatchObject({ status: 'ok', normalized: 'B12345674' })
  })

  it('control incorrecto: indica la letra esperada del NIF', () => {
    expect(classifyStoredTaxId('12345678A')).toMatchObject({
      status: 'control_incorrecto',
      detail: 'letra esperada Z',
    })
    expect(classifyStoredTaxId('B12345670').status).toBe('control_incorrecto')
    expect(classifyStoredTaxId('ESX1234567A').status).toBe('control_incorrecto')
  })

  it('formato inválido: parece un identificador español mal escrito (falta una cifra, etc.)', () => {
    expect(classifyStoredTaxId('1234567Z').status).toBe('formato_invalido')
    expect(classifyStoredTaxId('X123456Z').status).toBe('formato_invalido')
    expect(classifyStoredTaxId('B123456').status).toBe('formato_invalido')
  })

  it('REGRESIÓN: lo que no parece español no se marca como error (EIN de EE. UU., solo números...)', () => {
    expect(classifyStoredTaxId('5217485').status).toBe('otro_formato')
    expect(classifyStoredTaxId('4860621').status).toBe('otro_formato')
    expect(classifyStoredTaxId('1234').status).toBe('otro_formato')
    expect(classifyStoredTaxId('123456789').status).toBe('otro_formato')
  })

  it('vacío y extranjero (no se juzgan)', () => {
    expect(classifyStoredTaxId('').status).toBe('vacio')
    expect(classifyStoredTaxId('   ').status).toBe('vacio')
    expect(classifyStoredTaxId(null).status).toBe('vacio')
    expect(classifyStoredTaxId('FR12345678901').status).toBe('extranjero')
    expect(classifyStoredTaxId('PT501234567').status).toBe('extranjero')
  })
})
