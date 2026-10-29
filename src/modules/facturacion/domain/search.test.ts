import { describe, expect, it } from 'vitest'

import { invoiceMatchesQuery, normalizeForSearch } from '@/src/modules/facturacion/domain/search'
import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'

describe('normalizeForSearch', () => {
  it('quita tildes y diéresis y pasa a minúsculas', () => {
    expect(normalizeForSearch('Clínica Dental Sonrisa')).toBe('clinica dental sonrisa')
    expect(normalizeForSearch('PIÑA')).toBe('pina')
  })

  it('recorta espacios y deja intacto lo que no tiene tildes', () => {
    expect(normalizeForSearch('  F-2026-0001 ')).toBe('f-2026-0001')
  })

  it('una cadena vacía sigue vacía', () => {
    expect(normalizeForSearch('   ')).toBe('')
  })
})

describe('invoiceMatchesQuery', () => {
  const invoice = makeInvoice({ counterpartyName: 'Bodégas El Grifo S.A.', invoiceNumber: 'F-2026-0002', concept: 'Etiquetas y packaging' })

  it('encuentra con o sin tildes y sin distinguir mayúsculas', () => {
    expect(invoiceMatchesQuery(invoice, 'bodegas')).toBe(true)
    expect(invoiceMatchesQuery(invoice, 'BODÉGAS')).toBe(true)
  })

  it('busca en número, concepto y NIF', () => {
    expect(invoiceMatchesQuery(invoice, '2026-0002')).toBe(true)
    expect(invoiceMatchesQuery(invoice, 'packaging')).toBe(true)
    expect(invoiceMatchesQuery(invoice, invoice.counterpartyTaxId.toLowerCase())).toBe(true)
  })

  it('busca también en la descripción de cada línea', () => {
    const withLines = makeInvoice({
      concept: 'Logo (+1 más)',
      lines: [
        { id: 'a', description: 'Logo', quantity: 1, unitPriceCents: 100 },
        { id: 'b', description: 'Rotulación del escaparate', quantity: 1, unitPriceCents: 100 },
      ],
    })
    expect(invoiceMatchesQuery(withLines, 'escaparate')).toBe(true)
    expect(invoiceMatchesQuery(withLines, 'logo')).toBe(true)
  })

  it('una consulta vacía o de espacios las deja pasar todas, y una ajena ninguna', () => {
    expect(invoiceMatchesQuery(invoice, '')).toBe(true)
    expect(invoiceMatchesQuery(invoice, '   ')).toBe(true)
    expect(invoiceMatchesQuery(invoice, 'zzz')).toBe(false)
  })
})
