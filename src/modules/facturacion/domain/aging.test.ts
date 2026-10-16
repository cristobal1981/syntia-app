import { describe, expect, it } from 'vitest'

import { agingBucketOf, buildAging } from '@/src/modules/facturacion/domain/aging'
import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

function invoice(overrides: Partial<Invoice>): Invoice {
  return makeInvoice({
    id: 'x',
    invoiceNumber: 'F',
    issueDate: '2026-01-01',
    dueDate: '2026-01-31',
    counterpartyName: 'Cliente A',
    counterpartyTaxId: 'B35000001',
    concept: '',
    ...computeInvoiceAmounts(10000, 7, 0),
    ...overrides,
  })
}

describe('agingBucketOf', () => {
  it.each([
    [-10, 'current'],
    [0, 'current'],
    [1, 'd1_30'],
    [30, 'd1_30'],
    [31, 'd31_60'],
    [60, 'd31_60'],
    [61, 'd61_90'],
    [90, 'd61_90'],
    [91, 'd90_plus'],
  ])('%d días de retraso → %s', (days, bucket) => {
    expect(agingBucketOf(days)).toBe(bucket)
  })
})

describe('buildAging', () => {
  const today = '2026-04-10'

  it('reparte cada factura impagada en su tramo según el retraso sobre el vencimiento', () => {
    const report = buildAging(
      [
        invoice({ id: 'a', dueDate: '2026-04-20' }),
        invoice({ id: 'b', dueDate: '2026-04-01' }),
        invoice({ id: 'c', dueDate: '2026-02-20' }),
        invoice({ id: 'd', dueDate: '2025-12-01' }),
      ],
      'emitida',
      today
    )

    expect(report.rows).toHaveLength(1)
    expect(report.totals).toEqual({ current: 10700, d1_30: 10700, d31_60: 10700, d61_90: 0, d90_plus: 10700 })
    expect(report.totalCents).toBe(42800)
  })

  it('ignora las pagadas y las de la otra dirección', () => {
    const report = buildAging(
      [
        invoice({ id: 'a', paymentDate: '2026-02-01' }),
        invoice({ id: 'b', direction: 'recibida', categoryId: 'material' }),
      ],
      'emitida',
      today
    )
    expect(report.rows).toEqual([])
    expect(report.totalCents).toBe(0)
  })

  it('agrupa por tercero (NIF) y ordena de mayor a menor deuda', () => {
    const report = buildAging(
      [
        invoice({ id: 'a', counterpartyName: 'Pequeño', counterpartyTaxId: 'B1', ...computeInvoiceAmounts(1000, 7, 0) }),
        invoice({ id: 'b', counterpartyName: 'Grande', counterpartyTaxId: 'B2', ...computeInvoiceAmounts(50000, 7, 0) }),
        invoice({ id: 'c', counterpartyName: 'Grande', counterpartyTaxId: 'B2', ...computeInvoiceAmounts(50000, 7, 0) }),
      ],
      'emitida',
      today
    )
    expect(report.rows.map((row) => [row.name, row.totalCents])).toEqual([
      ['Grande', 107000],
      ['Pequeño', 1070],
    ])
  })

  it('los tramos de cada fila suman su total', () => {
    const report = buildAging(
      [invoice({ id: 'a', dueDate: '2026-04-20' }), invoice({ id: 'b', dueDate: '2026-02-01' })],
      'emitida',
      today
    )
    const [row] = report.rows
    expect(Object.values(row.buckets).reduce((a, b) => a + b, 0)).toBe(row.totalCents)
  })
})
