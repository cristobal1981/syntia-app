import type { Invoice } from '@/src/modules/facturacion/domain/types'

/** Una factura expedida es inalterable: solo se corrige con una factura rectificativa. */
export function isLocked(invoice: Pick<Invoice, 'status'>): boolean {
  return invoice.status === 'definitiva'
}

/** Los borradores no tienen número: no cuentan en el panel ni en los saldos. */
export function isAccounted(invoice: Pick<Invoice, 'status'>): boolean {
  return invoice.status === 'definitiva'
}

/** Solo las facturas expedidas cuentan en el panel y en los saldos. */
export function accountedInvoices(invoices: Invoice[]): Invoice[] {
  return invoices.filter(isAccounted)
}

export function canDeleteInvoice(invoice: Pick<Invoice, 'status'>): boolean {
  return !isLocked(invoice)
}

/**
 * Datos que siguen siendo modificables en una factura expedida porque no forman
 * parte de ella: cuándo se cobra y la revisión interna de la asesoría.
 */
const EDITABLE_WHEN_LOCKED: ReadonlySet<keyof Invoice> = new Set(['paymentDate', 'review'])

export type InvoiceChangeResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; error: 'locked'; fields: string[] }

/** Aplica cambios a una factura; si está expedida, rechaza cualquiera que toque su contenido. */
export function applyInvoiceChanges(existing: Invoice, changes: Partial<Invoice>): InvoiceChangeResult {
  if (isLocked(existing)) {
    const forbidden = (Object.keys(changes) as Array<keyof Invoice>).filter(
      (key) => !EDITABLE_WHEN_LOCKED.has(key) && changes[key] !== existing[key]
    )
    if (forbidden.length > 0) return { ok: false, error: 'locked', fields: forbidden }
  }

  return { ok: true, invoice: { ...existing, ...changes } }
}
