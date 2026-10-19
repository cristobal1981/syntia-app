import { describe, expect, it } from 'vitest'

import {
  canDeleteParty,
  emptyParty,
  findSimilarParties,
  partiesFromInvoices,
  partiesWithStats,
  type Party,
} from '@/src/modules/facturacion/domain/party-directory'
import { completeCif } from '@/src/modules/facturacion/domain/tax-id'
import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'

const party = (id: string, name: string, taxId: string): Party => ({ ...emptyParty(), id, name, taxId })

const ACME = party('a', 'Acme Rotulación S.L.', completeCif('B3500000'))
const OTHER = party('b', 'Ferretería Atlántico', completeCif('B3511111'))

describe('findSimilarParties', () => {
  it('sugiere al que tiene el mismo NIF aunque el nombre sea otro y con espacios o minúsculas', () => {
    const candidate = { id: 'new', name: 'Otro nombre', taxId: ` ${ACME.taxId.toLowerCase()} ` }
    expect(findSimilarParties(candidate, [ACME, OTHER])).toEqual([ACME])
  })

  it('sugiere por nombre parecido sin tildes, mayúsculas ni forma societaria', () => {
    const candidate = { id: 'new', name: 'ACME ROTULACIÓN', taxId: '' }
    expect(findSimilarParties(candidate, [ACME, OTHER])).toEqual([ACME])
  })

  it('no sugiere terceros distintos ni nombres demasiado cortos', () => {
    expect(findSimilarParties({ id: 'new', name: 'Papelería Sol', taxId: completeCif('B3522222') }, [ACME, OTHER])).toEqual([])
    expect(findSimilarParties({ id: 'new', name: 'Ac', taxId: '' }, [ACME, OTHER])).toEqual([])
  })

  it('no se sugiere a sí mismo al editar', () => {
    expect(findSimilarParties(ACME, [ACME])).toEqual([])
  })

  it('sin NIF escrito no empareja con terceros sin NIF', () => {
    const blank = party('c', 'Sin NIF Uno', '')
    expect(findSimilarParties({ id: 'new', name: 'Distinto', taxId: '' }, [blank])).toEqual([])
  })
})

describe('terceros comunes entre emitidas y recibidas', () => {
  const taxId = completeCif('B3500000')
  const issued = makeInvoice({ id: 'e', direction: 'emitida', counterpartyName: 'Acme', counterpartyTaxId: taxId })
  const received = makeInvoice({ id: 'r', direction: 'recibida', counterpartyName: 'Acme', counterpartyTaxId: taxId })

  it('el directorio inicial crea un solo tercero por NIF aunque sea cliente y proveedor', () => {
    expect(partiesFromInvoices([issued, received])).toHaveLength(1)
  })

  it('las cifras separan lo emitido de lo recibido y no se puede borrar con facturas', () => {
    const [directory] = partiesFromInvoices([issued, received])
    const [stats] = partiesWithStats([directory], [issued, received])
    expect(stats.invoiceCount).toBe(2)
    expect(stats.issuedCents).toBe(issued.totalCents)
    expect(stats.receivedCents).toBe(received.totalCents)
    expect(canDeleteParty(directory, [issued])).toBe(false)
    expect(canDeleteParty(directory, [])).toBe(true)
  })
})
