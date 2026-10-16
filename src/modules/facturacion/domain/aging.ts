import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import { daysOverdue } from '@/src/modules/facturacion/domain/payment-status'
import type { Invoice, InvoiceDirection } from '@/src/modules/facturacion/domain/types'

export type AgingBucketId = 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90_plus'

export const AGING_BUCKETS: readonly AgingBucketId[] = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus']

export function agingBucketOf(overdueDays: number): AgingBucketId {
  if (overdueDays <= 0) return 'current'
  if (overdueDays <= 30) return 'd1_30'
  if (overdueDays <= 60) return 'd31_60'
  if (overdueDays <= 90) return 'd61_90'
  return 'd90_plus'
}

type AgingRow = {
  partyKey: string
  name: string
  taxId: string
  buckets: Record<AgingBucketId, number>
  totalCents: number
}

export type AgingReport = {
  rows: AgingRow[]
  totals: Record<AgingBucketId, number>
  totalCents: number
}

function emptyBuckets(): Record<AgingBucketId, number> {
  return { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 }
}

/**
 * Antigüedad de saldos a una fecha: lo pendiente de cobro (emitidas) o de pago
 * (recibidas) por tercero, repartido según los días de retraso sobre el vencimiento.
 */
export function buildAging(invoices: Invoice[], direction: InvoiceDirection, today: string): AgingReport {
  const rows = new Map<string, AgingRow>()
  const totals = emptyBuckets()

  for (const invoice of accountedInvoices(invoices)) {
    if (invoice.direction !== direction || invoice.paymentDate) continue

    const key = invoice.counterpartyTaxId || invoice.counterpartyName
    const row =
      rows.get(key) ??
      ({
        partyKey: key,
        name: invoice.counterpartyName,
        taxId: invoice.counterpartyTaxId,
        buckets: emptyBuckets(),
        totalCents: 0,
      } satisfies AgingRow)
    const bucket = agingBucketOf(daysOverdue(invoice, today))

    row.buckets[bucket] += invoice.totalCents
    row.totalCents += invoice.totalCents
    totals[bucket] += invoice.totalCents
    rows.set(key, row)
  }

  const sorted = [...rows.values()].sort((a, b) => b.totalCents - a.totalCents || a.name.localeCompare(b.name))
  return {
    rows: sorted,
    totals,
    totalCents: sorted.reduce((sum, row) => sum + row.totalCents, 0),
  }
}
