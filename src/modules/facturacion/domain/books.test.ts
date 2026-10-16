import { describe, expect, it } from 'vitest'

import {
  buildIncomeExpenseBook,
  buildRegistryBook,
  expensesByCategory,
} from '@/src/modules/facturacion/domain/books'
import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'

const invoices = [...SAMPLE_INVOICES]
const accounted = accountedInvoices(invoices)

describe('buildRegistryBook', () => {
  it('solo recoge la dirección pedida, en orden cronológico y numerado', () => {
    const book = buildRegistryBook(invoices, 'emitida')

    expect(book.rows).toHaveLength(accounted.filter((i) => i.direction === 'emitida').length)
    expect(book.rows.map((row) => row.order)).toEqual(book.rows.map((_, index) => index + 1))
    const dates = book.rows.map((row) => row.date)
    expect(dates).toEqual([...dates].sort())
  })

  it('los totales son la suma de las filas', () => {
    const book = buildRegistryBook(invoices, 'recibida')
    const sum = (pick: (row: (typeof book.rows)[number]) => number) =>
      book.rows.reduce((total, row) => total + pick(row), 0)

    expect(book.baseCents).toBe(sum((row) => row.baseCents))
    expect(book.taxCents).toBe(sum((row) => row.taxCents))
    expect(book.withholdingCents).toBe(sum((row) => row.withholdingCents))
    expect(book.totalCents).toBe(sum((row) => row.totalCents))
    expect(book.totalCents).toBe(book.baseCents + book.taxCents - book.withholdingCents)
  })

  it('sin facturas devuelve un libro vacío con totales a cero', () => {
    expect(buildRegistryBook([], 'recibida')).toEqual({
      rows: [],
      baseCents: 0,
      taxCents: 0,
      withholdingCents: 0,
      totalCents: 0,
    })
  })
})

describe('buildIncomeExpenseBook', () => {
  const book = buildIncomeExpenseBook(invoices)

  it('ingresos = base de las emitidas; gastos = parte deducible de la base de las recibidas', () => {
    const income = accounted.filter((i) => i.direction === 'emitida').reduce((t, i) => t + i.baseCents, 0)
    const expense = invoices
      .filter((i) => i.direction === 'recibida')
      .reduce((t, i) => t + Math.round((i.baseCents * i.deductiblePercent) / 100), 0)

    expect(book.incomeCents).toBe(income)
    expect(book.expenseCents).toBe(expense)
    expect(book.resultCents).toBe(income - expense)
  })

  it('el resultado acumulado de la última fila es el resultado total', () => {
    expect(book.rows.at(-1)?.runningResultCents).toBe(book.resultCents)
  })

  it('una factura con el 50 % deducible solo cuenta la mitad de su base', () => {
    const vodafone = invoices.find((i) => i.invoiceNumber === 'V-1180')!
    const row = book.rows.find((r) => r.invoiceId === vodafone.id)!
    expect(row.expenseCents).toBe(Math.round(vodafone.baseCents / 2))
    expect(row.incomeCents).toBe(0)
  })

  it('el IGIC no entra ni en ingresos ni en gastos', () => {
    const emitted = invoices.find((i) => i.direction === 'emitida' && i.taxCents > 0)!
    const row = book.rows.find((r) => r.invoiceId === emitted.id)!
    expect(row.incomeCents).toBe(emitted.baseCents)
  })
})

describe('expensesByCategory', () => {
  it('agrupa el gasto deducible por categoría, de mayor a menor, sin contar emitidas', () => {
    const grouped = expensesByCategory(invoices)

    const amounts = grouped.map((entry) => entry.expenseCents)
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a))
    expect(grouped.reduce((total, entry) => total + entry.expenseCents, 0)).toBe(
      buildIncomeExpenseBook(invoices).expenseCents
    )
    expect(grouped.some((entry) => entry.categoryId === 'servicios')).toBe(false)
  })
})
