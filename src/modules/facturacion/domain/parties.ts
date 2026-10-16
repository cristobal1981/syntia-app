import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import type { Invoice, InvoiceDirection } from '@/src/modules/facturacion/domain/types'

export type Party = {
  key: string
  name: string
  taxId: string
  invoiceCount: number
  /** Total facturado (con impuestos y menos retención). */
  billedCents: number
  /** Parte aún sin cobrar o pagar. */
  pendingCents: number
  lastInvoiceDate: string
}

/** Clientes (emitidas) o proveedores (recibidas) con lo facturado y lo pendiente, de mayor a menor. */
export function buildParties(invoices: Invoice[], direction: InvoiceDirection): Party[] {
  const parties = new Map<string, Party>()

  for (const invoice of accountedInvoices(invoices)) {
    if (invoice.direction !== direction) continue

    const key = invoice.counterpartyTaxId || invoice.counterpartyName
    const party =
      parties.get(key) ??
      ({
        key,
        name: invoice.counterpartyName,
        taxId: invoice.counterpartyTaxId,
        invoiceCount: 0,
        billedCents: 0,
        pendingCents: 0,
        lastInvoiceDate: invoice.issueDate,
      } satisfies Party)

    party.invoiceCount += 1
    party.billedCents += invoice.totalCents
    if (!invoice.paymentDate) party.pendingCents += invoice.totalCents
    if (invoice.issueDate > party.lastInvoiceDate) {
      party.lastInvoiceDate = invoice.issueDate
      party.name = invoice.counterpartyName
    }
    parties.set(key, party)
  }

  return [...parties.values()].sort((a, b) => b.billedCents - a.billedCents || a.name.localeCompare(b.name))
}
