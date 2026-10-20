import { describe, expect, it } from 'vitest'

import { buildParties } from '@/src/modules/facturacion/domain/parties'
import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import { SAMPLE_INVOICES, SAMPLE_THIRD_PARTIES } from '@/src/modules/facturacion/domain/sample-invoices'

const invoices = [...SAMPLE_INVOICES]
const accounted = accountedInvoices(invoices)
const HOTEL_TAX_ID = SAMPLE_THIRD_PARTIES.hotel.taxId

describe('buildParties', () => {
  it('clientes: agrupa las facturas por NIF, con total facturado y pendiente', () => {
    const clients = buildParties(invoices)
    const hotel = clients.find((party) => party.taxId === HOTEL_TAX_ID)!

    const hotelInvoices = accounted.filter((i) => i.counterpartyTaxId === HOTEL_TAX_ID)
    expect(hotel.invoiceCount).toBe(hotelInvoices.length)
    expect(hotel.billedCents).toBe(hotelInvoices.reduce((t, i) => t + i.totalCents, 0))
    expect(hotel.pendingCents).toBe(hotelInvoices.filter((i) => !i.paymentDate).reduce((t, i) => t + i.totalCents, 0))
    expect(hotel.lastInvoiceDate).toBe(hotelInvoices.map((i) => i.issueDate).sort().at(-1))
  })

  it('van de mayor a menor facturado', () => {
    const billed = buildParties(invoices).map((party) => party.billedCents)
    expect(billed).toEqual([...billed].sort((a, b) => b - a))
  })

  it('el pendiente nunca supera lo facturado', () => {
    for (const party of buildParties(invoices)) {
      expect(party.pendingCents).toBeLessThanOrEqual(party.billedCents)
    }
  })

  it('sin facturas no hay clientes', () => {
    expect(buildParties([])).toEqual([])
  })
})
