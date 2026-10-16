import { deductibleExpenseCents } from '@/src/modules/facturacion/domain/compute-invoice'
import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import { daysOverdue, paymentStatus } from '@/src/modules/facturacion/domain/payment-status'
import { yearOf } from '@/src/modules/facturacion/domain/periods'
import type { Invoice, InvoiceDirection } from '@/src/modules/facturacion/domain/types'

export type MonthlyPoint = { month: number; incomeCents: number; expenseCents: number }

/** Ingresos (base de las emitidas) y gastos deducibles (recibidas) de cada mes del año. */
export function buildMonthlySeries(invoices: Invoice[], year: number): MonthlyPoint[] {
  const points: MonthlyPoint[] = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    incomeCents: 0,
    expenseCents: 0,
  }))

  for (const invoice of accountedInvoices(invoices)) {
    if (yearOf(invoice.issueDate) !== year) continue
    const point = points[Number(invoice.issueDate.slice(5, 7)) - 1]
    if (invoice.direction === 'emitida') point.incomeCents += invoice.baseCents
    else point.expenseCents += deductibleExpenseCents(invoice)
  }

  return points
}

export type PendingSummary = {
  pendingCents: number
  pendingCount: number
  overdueCents: number
  overdueCount: number
}

/** Lo pendiente de cobro o de pago a una fecha, y de ello lo ya vencido. */
export function buildPendingSummary(
  invoices: Invoice[],
  direction: InvoiceDirection,
  today: string
): PendingSummary {
  const summary: PendingSummary = { pendingCents: 0, pendingCount: 0, overdueCents: 0, overdueCount: 0 }

  for (const invoice of accountedInvoices(invoices)) {
    if (invoice.direction !== direction) continue
    const status = paymentStatus(invoice, today)
    if (status === 'pagada') continue

    summary.pendingCents += invoice.totalCents
    summary.pendingCount += 1
    if (status === 'vencida') {
      summary.overdueCents += invoice.totalCents
      summary.overdueCount += 1
    }
  }

  return summary
}

/** Facturas vencidas y sin pagar, de las más atrasadas a las que menos. */
export function listOverdueInvoices(invoices: Invoice[], today: string, limit: number): Invoice[] {
  return accountedInvoices(invoices)
    .filter((invoice) => paymentStatus(invoice, today) === 'vencida')
    .sort((a, b) => daysOverdue(b, today) - daysOverdue(a, today) || a.id.localeCompare(b.id))
    .slice(0, limit)
}

/**
 * Techo "redondo" (1, 2, 5 × 10ⁿ) por encima del valor, para el eje de un gráfico.
 * Con 0 o negativos devuelve un mínimo de 100 € para que el eje no se colapse.
 */
export function niceCeilCents(cents: number): number {
  const MIN = 10_000
  if (cents <= MIN) return MIN
  const magnitude = 10 ** Math.floor(Math.log10(cents))
  for (const step of [1, 2, 5, 10]) {
    if (step * magnitude >= cents) return step * magnitude
  }
  return 10 * magnitude
}
