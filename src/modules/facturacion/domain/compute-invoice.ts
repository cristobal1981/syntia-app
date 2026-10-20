import { percentOfCents } from '@/src/modules/facturacion/domain/money'
import type { Invoice, InvoiceDraft } from '@/src/modules/facturacion/domain/types'

export type InvoiceAmounts = Pick<
  Invoice,
  'baseCents' | 'taxRate' | 'taxCents' | 'withholdingRate' | 'withholdingCents' | 'totalCents'
>

/** Cuota y retención se calculan sobre la base; el total es base + cuota − retención. */
export function computeInvoiceAmounts(
  baseCents: number,
  taxRate: number,
  withholdingRate: number
): InvoiceAmounts {
  const taxCents = percentOfCents(baseCents, taxRate)
  const withholdingCents = percentOfCents(baseCents, withholdingRate)
  return {
    baseCents,
    taxRate,
    taxCents,
    withholdingRate,
    withholdingCents,
    totalCents: baseCents + taxCents - withholdingCents,
  }
}

/** El borrador equivalente a una factura guardada (para cambiarle un campo y volver a guardarla). */
export function draftFromInvoice(invoice: Invoice): InvoiceDraft {
  const { id, createdAt, ...draft } = invoice
  void id
  void createdAt
  return draft
}
