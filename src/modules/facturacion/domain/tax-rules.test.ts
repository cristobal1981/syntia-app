import { describe, expect, it } from 'vitest'

import { issuerTaxProfile, resolveTax, type IssuerTaxProfile } from '@/src/modules/facturacion/domain/tax-rules'

const person = (overrides: Partial<IssuerTaxProfile> = {}): IssuerTaxProfile => ({
  territory: 'canarias',
  isNaturalPerson: true,
  professional: true,
  newProfessional: false,
  ...overrides,
})

describe('issuerTaxProfile', () => {
  it('deduce territorio y persona física por el código postal y el NIF', () => {
    expect(issuerTaxProfile({ taxId: '12345678Z', postalCode: '35572', province: 'Las Palmas' })).toEqual({
      territory: 'canarias',
      isNaturalPerson: true,
      professional: true,
      newProfessional: false,
    })
  })

  it('una sociedad no es persona física ni profesional', () => {
    expect(issuerTaxProfile({ taxId: 'B35123454', postalCode: '28001', province: 'Madrid' })).toEqual({
      territory: 'peninsula',
      isNaturalPerson: false,
      professional: false,
      newProfessional: false,
    })
  })
})

describe('resolveTax — impuesto', () => {
  it('Canarias con Canarias: IGIC general', () => {
    expect(resolveTax(person(), { territory: 'canarias', kind: 'particular' })).toMatchObject({
      regime: 'igic',
      taxRate: 7,
      treatment: 'sujeta',
      note: '',
    })
  })

  it('península con península: IVA general', () => {
    expect(resolveTax(person({ territory: 'peninsula' }), { territory: 'peninsula', kind: 'particular' })).toMatchObject({
      regime: 'iva',
      taxRate: 21,
      treatment: 'sujeta',
      note: '',
    })
  })

  it('de Canarias a la península: no sujeta, a 0 % y con leyenda del IGIC', () => {
    const result = resolveTax(person(), { territory: 'peninsula', kind: 'particular' })
    expect(result).toMatchObject({ regime: 'igic', taxRate: 0, treatment: 'no_sujeta' })
    expect(result.note).toContain('no sujeta a IGIC')
  })

  it('de la península a Canarias: no sujeta, a 0 % y con leyenda del IVA', () => {
    const result = resolveTax(person({ territory: 'peninsula' }), { territory: 'canarias', kind: 'particular' })
    expect(result).toMatchObject({ regime: 'iva', taxRate: 0, treatment: 'no_sujeta' })
    expect(result.note).toContain('no sujeta a IVA')
  })

  it.each(['ue', 'fuera_ue'] as const)('un cliente de %s: exenta, a 0 % y con leyenda', (territory) => {
    const result = resolveTax(person(), { territory, kind: 'empresa' })
    expect(result).toMatchObject({ taxRate: 0, treatment: 'exenta', withholdingRate: 0 })
    expect(result.note).toContain('exenta de IGIC')
  })
})

describe('resolveTax — retención', () => {
  it('15 % de un profesional persona física a una empresa o a un autónomo', () => {
    expect(resolveTax(person(), { territory: 'canarias', kind: 'empresa' }).withholdingRate).toBe(15)
    expect(resolveTax(person(), { territory: 'canarias', kind: 'autonomo' }).withholdingRate).toBe(15)
  })

  it('7 % si es nuevo profesional', () => {
    expect(resolveTax(person({ newProfessional: true }), { territory: 'peninsula', kind: 'empresa' }).withholdingRate).toBe(7)
  })

  it('sin retención a un particular', () => {
    expect(resolveTax(person(), { territory: 'canarias', kind: 'particular' }).withholdingRate).toBe(0)
  })

  it('sin retención si el emisor es una sociedad o no es profesional', () => {
    expect(resolveTax(person({ isNaturalPerson: false }), { territory: 'canarias', kind: 'empresa' }).withholdingRate).toBe(0)
    expect(resolveTax(person({ professional: false }), { territory: 'canarias', kind: 'empresa' }).withholdingRate).toBe(0)
  })

  it('sin retención a un cliente de fuera de España', () => {
    expect(resolveTax(person(), { territory: 'ue', kind: 'empresa' }).withholdingRate).toBe(0)
    expect(resolveTax(person(), { territory: 'fuera_ue', kind: 'autonomo' }).withholdingRate).toBe(0)
  })

  it('la retención es independiente del impuesto: entre territorios hay retención aunque la operación no esté sujeta', () => {
    const result = resolveTax(person(), { territory: 'peninsula', kind: 'empresa' })
    expect(result.treatment).toBe('no_sujeta')
    expect(result.withholdingRate).toBe(15)
  })
})
