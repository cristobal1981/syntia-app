import { describe, expect, it } from 'vitest'

import { DEMO_ISSUER } from '@/src/modules/facturacion/domain/issuer'
import { isSameIssuer, issuerFromProfile } from '@/src/modules/facturacion/domain/issuer-from-profile'
import type { ClientProfile } from '@/src/modules/profile/domain/types'

const profile: ClientProfile = {
  id: 'c1',
  name: ' Estudio Gráfico Tías ',
  email: ' hola@estudio.example ',
  phone: ' 928 000 000 ',
  vat: '12345678z',
  iban: 'ES0000000000000000000000',
  address: { line1: ' Calle Ejemplo, 1 ', line2: ' Local 2 ', postalCode: '35572 ', city: ' Tías ', province: 'Las Palmas', country: 'España' },
}

describe('issuerFromProfile', () => {
  it('toma los datos del perfil, recortados y con el NIF en mayúsculas', () => {
    expect(issuerFromProfile(profile)).toEqual({
      name: 'Estudio Gráfico Tías',
      taxId: '12345678Z',
      address: 'Calle Ejemplo, 1, Local 2',
      postalCode: '35572',
      city: 'Tías',
      province: 'Las Palmas',
      email: 'hola@estudio.example',
      phone: '928 000 000',
    })
  })

  it('sin segunda línea el domicilio es solo la primera', () => {
    expect(issuerFromProfile({ ...profile, address: { ...profile.address, line2: '' } }).address).toBe('Calle Ejemplo, 1')
  })

  it('un nombre sin rellenar en Odoo («—») queda vacío para que se vea que falta', () => {
    expect(issuerFromProfile({ ...profile, name: '—' }).name).toBe('')
  })
})

describe('isSameIssuer', () => {
  it('compara todos los campos', () => {
    expect(isSameIssuer(DEMO_ISSUER, { ...DEMO_ISSUER })).toBe(true)
    for (const key of Object.keys(DEMO_ISSUER) as Array<keyof typeof DEMO_ISSUER>) {
      expect(isSameIssuer(DEMO_ISSUER, { ...DEMO_ISSUER, [key]: `${DEMO_ISSUER[key]}x` }), key).toBe(false)
    }
  })
})
