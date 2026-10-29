import { describe, expect, it } from 'vitest'

import { clientKindFromTaxId, isEntityTaxId, territoryFromAddress } from '@/src/modules/facturacion/domain/tax-profile'

describe('territoryFromAddress', () => {
  it.each([
    ['35500', '', 'canarias'],
    ['38001', '', 'canarias'],
    ['35000', '', 'canarias'],
    ['38999', '', 'canarias'],
    ['28001', '', 'peninsula'],
    ['07001', 'Baleares', 'peninsula'],
    ['34999', '', 'peninsula'],
    ['36000', '', 'peninsula'],
    ['37999', '', 'peninsula'],
    ['39000', '', 'peninsula'],
    ['51001', '', 'fuera_ue'],
    ['52001', '', 'fuera_ue'],
    ['', '', 'peninsula'],
  ] as const)('el código postal «%s» y la provincia «%s» son %s', (postalCode, province, expected) => {
    expect(territoryFromAddress({ postalCode, province })).toBe(expected)
  })

  it('la provincia decide si falta el código postal, sin distinguir mayúsculas', () => {
    expect(territoryFromAddress({ postalCode: '', province: 'LAS PALMAS' })).toBe('canarias')
    expect(territoryFromAddress({ postalCode: '', province: ' Santa Cruz de Tenerife ' })).toBe('canarias')
    expect(territoryFromAddress({ postalCode: '', province: 'Madrid' })).toBe('peninsula')
  })

  it('un código postal mal escrito no se toma por Ceuta o Melilla', () => {
    expect(territoryFromAddress({ postalCode: '51', province: '' })).toBe('peninsula')
    expect(territoryFromAddress({ postalCode: '5100a', province: '' })).toBe('peninsula')
  })
})

describe('isEntityTaxId / clientKindFromTaxId', () => {
  it.each(['B35123456', 'a-3500001', 'P3500001', 'G12345678', 'H1', 'J1', 'N1', 'Q1', 'R1', 'S1', 'U1', 'V1', 'W1', 'C1', 'D1', 'E1', 'F1'])(
    '«%s» es de entidad',
    (taxId) => {
      expect(isEntityTaxId(taxId)).toBe(true)
      expect(clientKindFromTaxId(taxId)).toBe('empresa')
    }
  )

  it.each(['12345678Z', 'X1234567L', 'Y1234567X', 'Z1234567R', 'K1234567A', 'L1234567A', 'M1234567A', ''])(
    '«%s» es de persona física',
    (taxId) => {
      expect(isEntityTaxId(taxId)).toBe(false)
      expect(clientKindFromTaxId(taxId)).toBe('particular')
    }
  )
})
