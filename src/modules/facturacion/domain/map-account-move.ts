import { mapOdooMany2OneLabel } from '@/src/modules/portal/infrastructure/odoo-json-client'
import type { Invoice, InvoiceStatus, VerifactuState } from '@/src/modules/facturacion/domain/types'

export type OdooAccountMoveRow = {
  id: number
  name?: string | false | null
  state?: string | false | null
  partner_id?: [number, string] | false | null
  invoice_date?: string | false | null
  amount_untaxed?: number | false | null
  amount_tax?: number | false | null
  amount_total?: number | false | null
  l10n_es_edi_verifactu_state?: string | false | null
}

function mapStatus(state: string | false | null | undefined): InvoiceStatus {
  if (state === 'posted') return 'posted'
  if (state === 'cancel') return 'cancel'
  return 'draft'
}

/**
 * Mapea el estado del documento Verifactu de Odoo a nuestro dominio. Los valores
 * exactos del selection dependen de la versión del módulo `l10n_es_edi_verifactu`
 * (confirmar en runbook C2); se mapean de forma defensiva.
 */
export function mapVerifactuState(
  value: string | false | null | undefined,
  status: InvoiceStatus
): VerifactuState {
  if (typeof value !== 'string' || !value) {
    return status === 'posted' ? 'not_sent' : 'not_sent'
  }

  switch (value) {
    case 'to_send':
    case 'queued':
      return 'queued'
    case 'sent':
    case 'processing':
    case 'sent_waiting':
      return 'sent_pending'
    case 'accepted':
    case 'registered':
      return 'registered'
    case 'accepted_with_errors':
    case 'registered_with_errors':
      return 'registered_with_errors'
    case 'rejected':
    case 'error':
      return 'rejected'
    case 'cancelled':
    case 'cancel':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

export function mapAccountMoveToInvoice(row: OdooAccountMoveRow): Invoice {
  const status = mapStatus(row.state)
  return {
    id: row.id,
    name: typeof row.name === 'string' && row.name !== '/' ? row.name : 'Borrador',
    status,
    verifactuState: mapVerifactuState(row.l10n_es_edi_verifactu_state, status),
    customerName: mapOdooMany2OneLabel(row.partner_id),
    invoiceDate: typeof row.invoice_date === 'string' ? row.invoice_date : undefined,
    amountUntaxed: typeof row.amount_untaxed === 'number' ? row.amount_untaxed : 0,
    amountTax: typeof row.amount_tax === 'number' ? row.amount_tax : 0,
    amountTotal: typeof row.amount_total === 'number' ? row.amount_total : 0,
  }
}
