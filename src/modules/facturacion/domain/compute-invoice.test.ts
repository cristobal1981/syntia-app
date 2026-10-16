import { describe, expect, it } from 'vitest'

import {
  computeInvoiceAmounts,
  deductibleExpenseCents,
  draftFromInvoice,
} from '@/src/modules/facturacion/domain/compute-invoice'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'

describe('computeInvoiceAmounts', () => {
  it('total = base + cuota − retención', () => {
    expect(computeInvoiceAmounts(100000, 7, 15)).toEqual({
      baseCents: 100000,
      taxRate: 7,
      taxCents: 7000,
      withholdingRate: 15,
      withholdingCents: 15000,
      totalCents: 92000,
    })
  })

  it('sin impuesto ni retención el total es la base', () => {
    expect(computeInvoiceAmounts(5000, 0, 0).totalCents).toBe(5000)
  })

  it('la retención se calcula sobre la base, no sobre la base más el impuesto', () => {
    expect(computeInvoiceAmounts(10000, 21, 15).withholdingCents).toBe(1500)
  })
})

describe('deductibleExpenseCents', () => {
  it('aplica el porcentaje deducible a la base de las recibidas', () => {
    expect(
      deductibleExpenseCents({ direction: 'recibida', baseCents: 10000, deductiblePercent: 50 })
    ).toBe(5000)
  })

  it('las emitidas no generan gasto deducible', () => {
    expect(
      deductibleExpenseCents({ direction: 'emitida', baseCents: 10000, deductiblePercent: 100 })
    ).toBe(0)
  })
})

describe('draftFromInvoice', () => {
  it('quita solo el identificador y la fecha de alta, y conserva el resto tal cual', () => {
    const [invoice] = SAMPLE_INVOICES
    const draft = draftFromInvoice(invoice)

    expect(draft).not.toHaveProperty('id')
    expect(draft).not.toHaveProperty('createdAt')
    expect({ ...draft, id: invoice.id, createdAt: invoice.createdAt }).toEqual(invoice)
  })
})
