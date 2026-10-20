import { describe, expect, it } from 'vitest'

import { DEMO_ISSUER, EMPTY_ISSUER, formatIssuerAddress, isIssuerComplete, validateIssuer } from '@/src/modules/facturacion/domain/issuer'

describe('validateIssuer', () => {
  it('el emisor de la demo es válido', () => {
    expect(validateIssuer(DEMO_ISSUER)).toEqual({})
    expect(isIssuerComplete(DEMO_ISSUER)).toBe(true)
  })

  it('el emisor vacío marca los datos obligatorios, pero no el email ni el teléfono', () => {
    expect(Object.keys(validateIssuer(EMPTY_ISSUER)).sort()).toEqual(['address', 'city', 'name', 'postalCode', 'taxId'])
    expect(isIssuerComplete(EMPTY_ISSUER)).toBe(false)
  })

  it('valida el dígito de control del NIF', () => {
    expect(validateIssuer({ ...DEMO_ISSUER, taxId: '12345678A' }).taxId).toBe('taxIdInvalid')
  })

  it('el código postal son cinco cifras', () => {
    expect(validateIssuer({ ...DEMO_ISSUER, postalCode: '3557' }).postalCode).toBe('postalCodeInvalid')
    expect(validateIssuer({ ...DEMO_ISSUER, postalCode: '35572' }).postalCode).toBeUndefined()
  })

  it('el email es opcional pero, si se escribe, debe tener forma de correo', () => {
    expect(validateIssuer({ ...DEMO_ISSUER, email: 'no-es-un-correo' }).email).toBe('emailInvalid')
    expect(validateIssuer({ ...DEMO_ISSUER, email: '' }).email).toBeUndefined()
  })
})

describe('formatIssuerAddress', () => {
  it('junta domicilio, código postal y población, y provincia', () => {
    expect(formatIssuerAddress(DEMO_ISSUER)).toBe('Calle Ejemplo, 1, 35572 Tías, Las Palmas')
  })

  it('omite las partes vacías', () => {
    expect(formatIssuerAddress({ address: 'Calle A', postalCode: '', city: 'Tías', province: '' })).toBe('Calle A, Tías')
  })
})
