import { describe, expect, it } from 'vitest'

import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'
import { buildYearTaxSummary } from '@/src/modules/facturacion/domain/tax-summary'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

function invoice(overrides: Partial<Invoice>): Invoice {
  return makeInvoice({
    id: 'x',
    invoiceNumber: 'F',
    issueDate: '2026-01-10',
    counterpartyName: 'T',
    concept: '',
    ...overrides,
  })
}

describe('buildYearTaxSummary — IGIC trimestral (modelo 420)', () => {
  it('repercutido − soportado, por trimestre', () => {
    const summary = buildYearTaxSummary(
      [
        invoice({ id: 'a', direction: 'emitida', issueDate: '2026-02-01', ...computeInvoiceAmounts(100000, 7, 0) }),
        invoice({ id: 'b', direction: 'recibida', categoryId: 'alquiler', issueDate: '2026-03-01', ...computeInvoiceAmounts(40000, 7, 0) }),
      ],
      2026
    )

    expect(summary[0].indirectTaxes).toEqual([
      { regime: 'igic', model: '420', chargedCents: 7000, deductibleCents: 2800, resultCents: 4200 },
    ])
    expect(summary[1].indirectTaxes).toEqual([])
  })

  it('un resultado negativo se mantiene (a compensar), no se trunca a cero', () => {
    const summary = buildYearTaxSummary(
      [invoice({ direction: 'recibida', categoryId: 'material', ...computeInvoiceAmounts(100000, 7, 0) })],
      2026
    )
    expect(summary[0].indirectTaxes[0].resultCents).toBe(-7000)
  })

  it('IVA e IGIC se liquidan por separado, cada uno en su modelo', () => {
    const summary = buildYearTaxSummary(
      [
        invoice({ id: 'a', regime: 'igic' }),
        invoice({ id: 'b', regime: 'iva', ...computeInvoiceAmounts(100000, 21, 0) }),
      ],
      2026
    )
    expect(summary[0].indirectTaxes.map((t) => [t.regime, t.model])).toEqual([
      ['igic', '420'],
      ['iva', '303'],
    ])
  })
})

describe('buildYearTaxSummary — retenciones', () => {
  it('separa las que nos practican (emitidas) de las que practicamos (recibidas)', () => {
    const [q1] = buildYearTaxSummary(
      [
        invoice({ id: 'a', direction: 'emitida', ...computeInvoiceAmounts(100000, 7, 15) }),
        invoice({ id: 'b', direction: 'recibida', categoryId: 'alquiler', ...computeInvoiceAmounts(50000, 7, 19) }),
      ],
      2026
    )
    expect(q1.withholdingsSufferedCents).toBe(15000)
    expect(q1.withholdingsAppliedCents).toBe(9500)
  })
})

describe('buildYearTaxSummary — pago fraccionado (modelo 130)', () => {
  it('es el 20 % del rendimiento neto acumulado menos retenciones y pagos anteriores', () => {
    const summary = buildYearTaxSummary(
      [
        invoice({ id: 'a', issueDate: '2026-01-10', ...computeInvoiceAmounts(1000000, 7, 0) }),
        invoice({ id: 'b', issueDate: '2026-04-10', ...computeInvoiceAmounts(500000, 7, 0) }),
      ],
      2026
    )

    expect(summary[0].fractionalPaymentCents).toBe(200000)
    // Acumulado 15.000 € × 20 % = 3.000 € − 2.000 € ya pagados.
    expect(summary[1].fractionalPaymentCents).toBe(100000)
    expect(summary[2].fractionalPaymentCents).toBe(0)
  })

  it('las retenciones soportadas reducen el pago', () => {
    const [q1] = buildYearTaxSummary(
      [invoice({ ...computeInvoiceAmounts(1000000, 7, 15) })],
      2026
    )
    expect(q1.fractionalPaymentCents).toBe(200000 - 150000)
  })

  it('nunca es negativo: con pérdidas el pago es cero', () => {
    const summary = buildYearTaxSummary(
      [invoice({ direction: 'recibida', categoryId: 'material', ...computeInvoiceAmounts(100000, 7, 0) })],
      2026
    )
    expect(summary.every((quarter) => quarter.fractionalPaymentCents === 0)).toBe(true)
    expect(summary[0].netCents).toBe(-100000)
  })

  it('un trimestre con pérdidas compensa los beneficios de los siguientes dentro del acumulado', () => {
    const summary = buildYearTaxSummary(
      [
        invoice({ id: 'a', direction: 'recibida', categoryId: 'material', issueDate: '2026-01-10', ...computeInvoiceAmounts(400000, 7, 0) }),
        invoice({ id: 'b', issueDate: '2026-04-10', ...computeInvoiceAmounts(1000000, 7, 0) }),
      ],
      2026
    )
    expect(summary[0].fractionalPaymentCents).toBe(0)
    // Acumulado 6.000 € × 20 % = 1.200 €.
    expect(summary[1].fractionalPaymentCents).toBe(120000)
  })

  it('solo cuenta el año pedido', () => {
    const summary = buildYearTaxSummary([invoice({ issueDate: '2025-12-31' })], 2026)
    expect(summary.every((quarter) => quarter.incomeCents === 0)).toBe(true)
  })

  it('con las facturas de ejemplo devuelve cuatro trimestres', () => {
    const summary = buildYearTaxSummary([...SAMPLE_INVOICES], 2026)
    expect(summary.map((quarter) => quarter.quarter)).toEqual([1, 2, 3, 4])
  })
})
