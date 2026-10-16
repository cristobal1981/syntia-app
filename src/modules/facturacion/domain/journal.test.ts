import { describe, expect, it } from 'vitest'

import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { buildJournal, entryTotals, isBalanced } from '@/src/modules/facturacion/domain/journal'
import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

function invoice(overrides: Partial<Invoice> & Pick<Invoice, 'direction'>): Invoice {
  return makeInvoice({
    id: 'i1',
    invoiceNumber: 'F-1',
    issueDate: '2026-03-10',
    counterpartyName: 'Tercero S.L.',
    concept: 'Concepto',
    categoryId: overrides.direction === 'recibida' ? 'alquiler' : 'servicios',
    ...computeInvoiceAmounts(100000, 7, 15),
    ...overrides,
  })
}

describe('buildJournal — factura recibida', () => {
  it('debe: gasto e IGIC soportado; haber: retención y acreedor por el total', () => {
    const [entry] = buildJournal([invoice({ direction: 'recibida' })])

    expect(entry.lines).toEqual([
      { account: '621', accountName: 'Arrendamientos y cánones', debitCents: 100000, creditCents: 0 },
      { account: '472', accountName: 'H.P. IGIC soportado', debitCents: 7000, creditCents: 0 },
      { account: '4751', accountName: 'H.P. acreedora por retenciones practicadas', debitCents: 0, creditCents: 15000 },
      { account: '410', accountName: 'Acreedores por prestaciones de servicios', debitCents: 0, creditCents: 92000 },
    ])
    expect(isBalanced(entry)).toBe(true)
  })

  it('con IVA el nombre de la cuenta de impuesto cambia', () => {
    const [entry] = buildJournal([invoice({ direction: 'recibida', regime: 'iva' })])
    expect(entry.lines.find((line) => line.account === '472')?.accountName).toBe('H.P. IVA soportado')
  })

  it('las compras de mercaderías van a proveedores (400)', () => {
    const [entry] = buildJournal([invoice({ direction: 'recibida', categoryId: 'compras' })])
    expect(entry.lines.some((line) => line.account === '400')).toBe(true)
    expect(entry.lines.some((line) => line.account === '410')).toBe(false)
  })
})

describe('buildJournal — factura emitida', () => {
  it('debe: cliente y retención soportada; haber: ingreso e IGIC repercutido', () => {
    const [entry] = buildJournal([invoice({ direction: 'emitida' })])

    expect(entry.lines).toEqual([
      { account: '430', accountName: 'Clientes', debitCents: 92000, creditCents: 0 },
      { account: '473', accountName: 'H.P. retenciones y pagos a cuenta', debitCents: 15000, creditCents: 0 },
      { account: '705', accountName: 'Prestaciones de servicios', debitCents: 0, creditCents: 100000 },
      { account: '477', accountName: 'H.P. IGIC repercutido', debitCents: 0, creditCents: 7000 },
    ])
    expect(isBalanced(entry)).toBe(true)
  })
})

describe('buildJournal — líneas a cero y tesorería', () => {
  it('sin impuesto ni retención no aparecen líneas a cero', () => {
    const [entry] = buildJournal([
      invoice({ direction: 'recibida', ...computeInvoiceAmounts(5000, 0, 0) }),
    ])
    expect(entry.lines.map((line) => line.account)).toEqual(['621', '410'])
  })

  it('una factura pagada genera además el asiento de pago contra bancos', () => {
    const entries = buildJournal([invoice({ direction: 'recibida', paymentDate: '2026-03-20' })])

    expect(entries.map((entry) => entry.kind)).toEqual(['registro', 'pago'])
    expect(entries[1].date).toBe('2026-03-20')
    expect(entries[1].lines).toEqual([
      { account: '410', accountName: 'Acreedores por prestaciones de servicios', debitCents: 92000, creditCents: 0 },
      { account: '572', accountName: 'Bancos e instituciones de crédito c/c', debitCents: 0, creditCents: 92000 },
    ])
  })

  it('un cobro va al debe de bancos y al haber de clientes', () => {
    const entries = buildJournal([invoice({ direction: 'emitida', paymentDate: '2026-03-20' })])
    expect(entries[1].lines.map((line) => [line.account, line.debitCents, line.creditCents])).toEqual([
      ['572', 92000, 0],
      ['430', 0, 92000],
    ])
  })

  it('una factura pendiente de pago no genera asiento de tesorería', () => {
    expect(buildJournal([invoice({ direction: 'recibida' })])).toHaveLength(1)
  })
})

describe('buildJournal — orden y numeración', () => {
  it('ordena por fecha, numera correlativamente y pone el registro antes del pago del mismo día', () => {
    const entries = buildJournal([
      invoice({ id: 'b', direction: 'recibida', issueDate: '2026-05-10', invoiceNumber: 'B', paymentDate: '2026-05-10' }),
      invoice({ id: 'a', direction: 'emitida', issueDate: '2026-02-01', invoiceNumber: 'A' }),
    ])

    expect(entries.map((entry) => entry.number)).toEqual([1, 2, 3])
    expect(entries.map((entry) => [entry.invoiceId, entry.kind])).toEqual([
      ['a', 'registro'],
      ['b', 'registro'],
      ['b', 'pago'],
    ])
  })
})

describe('buildJournal — facturas de ejemplo', () => {
  const entries = buildJournal([...SAMPLE_INVOICES])

  it('todos los asientos cuadran (debe = haber)', () => {
    for (const entry of entries) {
      const { debitCents, creditCents } = entryTotals(entry)
      expect(debitCents, entry.concept).toBe(creditCents)
    }
  })

  it('las facturas de ejemplo cumplen total = base + cuota − retención', () => {
    for (const sample of SAMPLE_INVOICES) {
      expect(sample.totalCents, sample.invoiceNumber).toBe(
        sample.baseCents + sample.taxCents - sample.withholdingCents
      )
    }
  })
})
