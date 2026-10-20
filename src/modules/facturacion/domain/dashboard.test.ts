import { describe, expect, it } from 'vitest'

import {
  buildMonthlySeries,
  niceCeilCents,
  buildPendingSummary,
  listOverdueInvoices,
} from '@/src/modules/facturacion/domain/dashboard'
import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'

const invoices = [...SAMPLE_INVOICES]
const accounted = accountedInvoices(invoices)
const TODAY = '2026-10-16'

describe('buildMonthlySeries', () => {
  const series = buildMonthlySeries(invoices, 2026)

  it('devuelve los doce meses', () => {
    expect(series.map((point) => point.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('la suma de los meses coincide con la base facturada del año', () => {
    const income = accounted.filter((i) => i.issueDate.startsWith('2026')).reduce((t, i) => t + i.baseCents, 0)
    expect(series.reduce((t, p) => t + p.incomeCents, 0)).toBe(income)
  })

  it('coloca cada factura en el mes de su fecha', () => {
    const january = series[0]
    const expectedIncome = invoices
      .filter((i) => i.status === 'definitiva' && i.issueDate.startsWith('2026-01'))
      .reduce((t, i) => t + i.baseCents, 0)
    expect(january.incomeCents).toBe(expectedIncome)
    expect(january.incomeCents).toBeGreaterThan(0)
  })

  it('otro año sin facturas sale todo a cero', () => {
    expect(buildMonthlySeries(invoices, 2020).every((p) => p.incomeCents === 0)).toBe(true)
  })
})

describe('buildPendingSummary', () => {
  it('cuenta lo impagado y, de ello, lo vencido', () => {
    const summary = buildPendingSummary(invoices, TODAY)
    const unpaid = accounted.filter((i) => !i.paymentDate)
    const overdue = unpaid.filter((i) => i.dueDate < TODAY)

    expect(summary.pendingCount).toBe(unpaid.length)
    expect(summary.pendingCents).toBe(unpaid.reduce((t, i) => t + i.totalCents, 0))
    expect(summary.overdueCount).toBe(overdue.length)
    expect(summary.overdueCents).toBe(overdue.reduce((t, i) => t + i.totalCents, 0))
    expect(summary.pendingCount).toBeGreaterThan(0)
  })

  it('una factura que vence hoy está pendiente, no vencida', () => {
    const [sample] = accounted
    const summary = buildPendingSummary([{ ...sample, paymentDate: null, dueDate: TODAY }], TODAY)
    expect(summary).toMatchObject({ pendingCount: 1, overdueCount: 0, overdueCents: 0 })
  })
})

describe('listOverdueInvoices', () => {
  it('ordena de más a menos atrasada y respeta el límite', () => {
    const list = listOverdueInvoices(invoices, TODAY, 3)
    expect(list.length).toBeLessThanOrEqual(3)
    const dues = list.map((i) => i.dueDate)
    expect(dues).toEqual([...dues].sort())
    expect(list.every((i) => !i.paymentDate && i.dueDate < TODAY)).toBe(true)
  })
})

describe('niceCeilCents', () => {
  it.each([
    [0, 10_000],
    [5_000, 10_000],
    [10_000, 10_000],
    [10_001, 20_000],
    [123_456, 200_000],
    [200_000, 200_000],
    [200_001, 500_000],
    [480_000, 500_000],
    [500_001, 1_000_000],
    [1_234_567, 2_000_000],
  ])('%d céntimos → techo %d', (value, expected) => {
    expect(niceCeilCents(value)).toBe(expected)
  })

  it('siempre cubre el valor', () => {
    for (const value of [1, 999, 10_001, 77_777, 4_999_999, 123_456_789]) {
      expect(niceCeilCents(value)).toBeGreaterThanOrEqual(value)
    }
  })
})
