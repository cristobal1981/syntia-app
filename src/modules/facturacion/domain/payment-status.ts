import { daysBetweenIso } from '@/src/modules/facturacion/domain/dates'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

export type PaymentStatus = 'pagada' | 'vencida' | 'pendiente'

/** Plazo de pago por defecto cuando no se indica vencimiento. */
export const DEFAULT_PAYMENT_TERM_DAYS = 30

export function paymentStatus(invoice: Pick<Invoice, 'paymentDate' | 'dueDate'>, today: string): PaymentStatus {
  if (invoice.paymentDate) return 'pagada'
  return invoice.dueDate < today ? 'vencida' : 'pendiente'
}

/** Días de retraso de una factura impagada; 0 si aún no ha vencido (vencer hoy no es retraso). */
export function daysOverdue(invoice: Pick<Invoice, 'paymentDate' | 'dueDate'>, today: string): number {
  if (invoice.paymentDate) return 0
  return Math.max(daysBetweenIso(invoice.dueDate, today), 0)
}
