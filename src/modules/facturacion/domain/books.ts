import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import { getCategory } from '@/src/modules/facturacion/domain/categories'
import { deductibleExpenseCents } from '@/src/modules/facturacion/domain/compute-invoice'
import { compareInvoices } from '@/src/modules/facturacion/domain/periods'
import type { Invoice, InvoiceDirection } from '@/src/modules/facturacion/domain/types'

type RegistryRow = {
  /** Número de orden dentro del libro. */
  order: number
  invoiceId: string
  date: string
  invoiceNumber: string
  counterpartyName: string
  counterpartyTaxId: string
  concept: string
  baseCents: number
  taxRate: number
  taxCents: number
  withholdingCents: number
  totalCents: number
}

export type RegistryBook = {
  rows: RegistryRow[]
  baseCents: number
  taxCents: number
  withholdingCents: number
  totalCents: number
}

/** Libro registro de facturas recibidas o emitidas (IGIC/IVA), en orden cronológico. */
export function buildRegistryBook(invoices: Invoice[], direction: InvoiceDirection): RegistryBook {
  const rows = accountedInvoices(invoices)
    .filter((invoice) => invoice.direction === direction)
    .sort(compareInvoices)
    .map<RegistryRow>((invoice, index) => ({
      order: index + 1,
      invoiceId: invoice.id,
      date: invoice.issueDate,
      invoiceNumber: invoice.invoiceNumber,
      counterpartyName: invoice.counterpartyName,
      counterpartyTaxId: invoice.counterpartyTaxId,
      concept: invoice.concept,
      baseCents: invoice.baseCents,
      taxRate: invoice.taxRate,
      taxCents: invoice.taxCents,
      withholdingCents: invoice.withholdingCents,
      totalCents: invoice.totalCents,
    }))

  return {
    rows,
    baseCents: sum(rows, (row) => row.baseCents),
    taxCents: sum(rows, (row) => row.taxCents),
    withholdingCents: sum(rows, (row) => row.withholdingCents),
    totalCents: sum(rows, (row) => row.totalCents),
  }
}

type IncomeExpenseRow = {
  invoiceId: string
  date: string
  invoiceNumber: string
  counterpartyName: string
  categoryLabel: string
  direction: InvoiceDirection
  incomeCents: number
  expenseCents: number
  /** Resultado acumulado (ingresos − gastos deducibles) hasta esta fila. */
  runningResultCents: number
}

export type IncomeExpenseBook = {
  rows: IncomeExpenseRow[]
  incomeCents: number
  expenseCents: number
  resultCents: number
}

/**
 * Libro de ingresos y gastos (estimación directa simplificada de IRPF): ingresos
 * por la base de las emitidas y gastos por la parte deducible de las recibidas.
 * El IGIC/IVA no cuenta: se liquida aparte.
 */
export function buildIncomeExpenseBook(invoices: Invoice[]): IncomeExpenseBook {
  let running = 0

  const rows = accountedInvoices(invoices).sort(compareInvoices).map<IncomeExpenseRow>((invoice) => {
    const incomeCents = invoice.direction === 'emitida' ? invoice.baseCents : 0
    const expenseCents = deductibleExpenseCents(invoice)
    running += incomeCents - expenseCents

    return {
      invoiceId: invoice.id,
      date: invoice.issueDate,
      invoiceNumber: invoice.invoiceNumber,
      counterpartyName: invoice.counterpartyName,
      categoryLabel: getCategory(invoice.categoryId, invoice.direction).label,
      direction: invoice.direction,
      incomeCents,
      expenseCents,
      runningResultCents: running,
    }
  })

  const incomeCents = sum(rows, (row) => row.incomeCents)
  const expenseCents = sum(rows, (row) => row.expenseCents)
  return { rows, incomeCents, expenseCents, resultCents: incomeCents - expenseCents }
}

export type ExpenseByCategory = { categoryId: string; label: string; expenseCents: number }

/** Gasto deducible agrupado por categoría, de mayor a menor. */
export function expensesByCategory(invoices: Invoice[]): ExpenseByCategory[] {
  const totals = new Map<string, ExpenseByCategory>()

  for (const invoice of accountedInvoices(invoices)) {
    if (invoice.direction !== 'recibida') continue
    const category = getCategory(invoice.categoryId, 'recibida')
    const entry = totals.get(category.id) ?? { categoryId: category.id, label: category.label, expenseCents: 0 }
    entry.expenseCents += deductibleExpenseCents(invoice)
    totals.set(category.id, entry)
  }

  return [...totals.values()].sort((a, b) => b.expenseCents - a.expenseCents)
}

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0)
}
