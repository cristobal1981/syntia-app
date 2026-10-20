import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import type { Invoice, InvoiceDraft } from '@/src/modules/facturacion/domain/types'

/** Solo se rectifica una factura ordinaria ya expedida (no una rectificativa ni un borrador). */
export function canRectify(invoice: Invoice): boolean {
  return invoice.status === 'definitiva' && invoice.kind === 'ordinaria'
}

/** Rectificativas expedidas de una factura, de la más antigua a la más reciente. */
export function rectificationsOf(original: Invoice, all: Invoice[]): Invoice[] {
  return all
    .filter((invoice) => invoice.kind === 'rectificativa' && invoice.status === 'definitiva' && invoice.rectifies === original.id)
    .sort((a, b) => a.issueDate.localeCompare(b.issueDate) || (a.sequence ?? 0) - (b.sequence ?? 0))
}

/** Importes vigentes de una factura una vez aplicadas sus rectificativas. */
export function netAmountsAfterRectification(original: Invoice, all: Invoice[]) {
  const rectifications = rectificationsOf(original, all)
  const sum = (pick: (invoice: Invoice) => number) =>
    pick(original) + rectifications.reduce((total, invoice) => total + pick(invoice), 0)
  return {
    baseCents: sum((invoice) => invoice.baseCents),
    taxCents: sum((invoice) => invoice.taxCents),
    withholdingCents: sum((invoice) => invoice.withholdingCents),
    totalCents: sum((invoice) => invoice.totalCents),
  }
}

export type RectificationInput =
  | { mode: 'total'; reason: string; issueDate: string }
  /** `deltaBaseCents`: variación de la base con signo (negativa si se reduce). */
  | { mode: 'parcial'; reason: string; issueDate: string; deltaBaseCents: number }

export type RectificationIssueCode = 'not_rectifiable' | 'reason' | 'delta_zero' | 'already_rectified' | 'exceeds_original'

/** Valida la rectificación: motivo, que haya algo que rectificar y que no se rectifique más de lo facturado. */
export function validateRectification(
  original: Invoice,
  all: Invoice[],
  input: RectificationInput
): RectificationIssueCode[] {
  if (!canRectify(original)) return ['not_rectifiable']

  const issues: RectificationIssueCode[] = []
  if (!input.reason.trim()) issues.push('reason')

  const net = netAmountsAfterRectification(original, all)
  if (net.baseCents === 0) {
    issues.push('already_rectified')
    return issues
  }

  if (input.mode === 'parcial') {
    if (input.deltaBaseCents === 0) issues.push('delta_zero')
    else if (net.baseCents + input.deltaBaseCents < 0) issues.push('exceeds_original')
  }

  return issues
}

/**
 * Borrador de la rectificativa (art. 15 del Reglamento): identifica la factura
 * rectificada, copia los datos del tercero y consigna la rectificación con signo.
 * En la total anula lo que quede vigente; en la parcial, la variación indicada.
 */
export function buildRectificationDraft(original: Invoice, all: Invoice[], input: RectificationInput): InvoiceDraft {
  const net = netAmountsAfterRectification(original, all)
  const amounts =
    input.mode === 'total'
      ? {
          baseCents: -net.baseCents,
          taxRate: original.taxRate,
          taxCents: -net.taxCents,
          withholdingRate: original.withholdingRate,
          withholdingCents: -net.withholdingCents,
          totalCents: -net.totalCents,
        }
      : computeInvoiceAmounts(input.deltaBaseCents, original.taxRate, original.withholdingRate)

  return {
    invoiceNumber: '',
    status: 'borrador',
    kind: 'rectificativa',
    series: '',
    sequence: null,
    issueDate: input.issueDate,
    dueDate: input.issueDate,
    counterpartyName: original.counterpartyName,
    counterpartyTaxId: original.counterpartyTaxId,
    counterpartyAddress: original.counterpartyAddress,
    concept: `Rectificación de la factura ${original.invoiceNumber}`,
    categoryId: original.categoryId,
    regime: original.regime,
    ...amounts,
    paymentDate: null,
    review: 'pendiente',
    rectifies: original.id,
    rectificationReason: input.reason.trim(),
    issuedAt: null,
    issuer: null,
    source: 'manual',
  }
}
