import { describe, expect, it } from 'vitest'

import {
  canDeleteParty,
  validateParty,
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

describe('directorio de clientes', () => {
  const taxId = completeCif('B3500000')
  const first = makeInvoice({ id: 'a', counterpartyName: 'Acme', counterpartyTaxId: taxId, paymentDate: '2026-02-01' })
  const second = makeInvoice({ id: 'b', counterpartyName: 'Acme', counterpartyTaxId: taxId, totalCents: 5000 })
  const draft = makeInvoice({ id: 'c', counterpartyName: 'Acme', counterpartyTaxId: taxId, status: 'borrador' })

  it('el directorio inicial crea un solo cliente por NIF', () => {
    expect(partiesFromInvoices([first, second])).toHaveLength(1)
  })

  it('las cifras cuentan solo las facturas expedidas y separan lo pendiente', () => {
    const [directory] = partiesFromInvoices([first, second])
    const [stats] = partiesWithStats([directory], [first, second, draft])
    expect(stats.invoiceCount).toBe(2)
    expect(stats.billedCents).toBe(first.totalCents + second.totalCents)
    expect(stats.pendingCents).toBe(second.totalCents)
  })

  it('una corrección del cliente no cuenta como pendiente de cobro', () => {
    const correction = makeInvoice({ id: 'r', kind: 'rectificativa', counterpartyName: 'Acme', counterpartyTaxId: taxId, totalCents: -2000, paymentDate: null })
    const [directory] = partiesFromInvoices([first, second])
    const [stats] = partiesWithStats([directory], [first, second, correction])
    expect(stats.pendingCents).toBe(second.totalCents)
    expect(stats.billedCents).toBe(first.totalCents + second.totalCents - 2000)
  })

  it('no se puede borrar un cliente con facturas, ni siquiera con borradores', () => {
    const [directory] = partiesFromInvoices([first])
    expect(canDeleteParty(directory, [draft])).toBe(false)
    expect(canDeleteParty(directory, [])).toBe(true)
  })
})

describe('validateParty: límites', () => {
  const base = { ...emptyParty(), id: 'p', name: 'Acme', taxId: completeCif('B3500000') }

  it('rechaza nombres y domicilios desmesurados', () => {
    expect(validateParty({ ...base, name: 'N'.repeat(121) }).name).toBe('tooLong')
    expect(validateParty({ ...base, address: 'D'.repeat(201) }).address).toBe('tooLong')
  })

  it('admite los máximos exactos y acepta un NIF repetido', () => {
    expect(validateParty({ ...base, name: 'N'.repeat(120), address: 'D'.repeat(200) })).toEqual({})
  })
})
