import type { Invoice } from '@/src/modules/facturacion/domain/types'

export type Quarter = 1 | 2 | 3 | 4

/** Periodo de trabajo: un año completo (`quarter: null`) o uno de sus trimestres. */
export type InvoicePeriod = { year: number; quarter: Quarter | null }

export function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4))
}

export function quarterOf(isoDate: string): Quarter {
  return (Math.floor((Number(isoDate.slice(5, 7)) - 1) / 3) + 1) as Quarter
}

export function isInPeriod(isoDate: string, period: InvoicePeriod): boolean {
  if (yearOf(isoDate) !== period.year) return false
  return period.quarter === null || quarterOf(isoDate) === period.quarter
}

export function filterByPeriod(invoices: Invoice[], period: InvoicePeriod): Invoice[] {
  return invoices.filter((invoice) => isInPeriod(invoice.issueDate, period))
}

/** Años con facturas, del más reciente al más antiguo; siempre incluye `fallbackYear`. */
export function availableYears(invoices: Invoice[], fallbackYear: number): number[] {
  const years = new Set<number>([fallbackYear])
  for (const invoice of invoices) years.add(yearOf(invoice.issueDate))
  return [...years].sort((a, b) => b - a)
}

export function compareInvoices(a: Invoice, b: Invoice): number {
  return (
    a.issueDate.localeCompare(b.issueDate) ||
    a.invoiceNumber.localeCompare(b.invoiceNumber) ||
    a.id.localeCompare(b.id)
  )
}
