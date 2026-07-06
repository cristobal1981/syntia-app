import {
  mapVerifactuState,
} from '@/src/modules/facturacion/domain/map-account-move'
import type { VerifactuState } from '@/src/modules/facturacion/domain/types'
import { isOdooVerifactuEnabled } from '@/src/modules/facturacion/infrastructure/facturacion-env'
import {
  mapOdooMany2OneLabel,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

export type VerifactuIssue = {
  moveId: number
  invoiceName: string
  companyName?: string
  customerName?: string
  invoiceDate?: string
  amountTotal: number
  verifactuState: VerifactuState
}

/** Valores de estado con incidencia (nombres exactos a confirmar en runbook C2). */
const ISSUE_STATES = [
  'rejected',
  'error',
  'accepted_with_errors',
  'registered_with_errors',
]

/**
 * Facturas con registro Verifactu rechazado o aceptado con errores, en todas
 * las companies visibles para el service account. Devuelve vacío si el módulo
 * Verifactu no está instalado.
 */
export async function listVerifactuIssues(
  limit = 200
): Promise<VerifactuIssue[]> {
  if (!isOdooVerifactuEnabled()) {
    return []
  }

  let rows: Array<{
    id: number
    name?: string | false | null
    company_id?: [number, string] | false | null
    partner_id?: [number, string] | false | null
    invoice_date?: string | false | null
    amount_total?: number | false | null
    l10n_es_edi_verifactu_state?: string | false | null
  }>

  try {
    rows = await odooSearchRead('account.move', {
      domain: [
        ['move_type', 'in', ['out_invoice', 'out_refund']],
        ['state', '=', 'posted'],
        ['l10n_es_edi_verifactu_state', 'in', ISSUE_STATES],
      ],
      fields: [
        'name',
        'company_id',
        'partner_id',
        'invoice_date',
        'amount_total',
        'l10n_es_edi_verifactu_state',
      ],
      order: 'invoice_date desc, id desc',
      limit,
    })
  } catch {
    return []
  }

  return rows.map((row) => ({
    moveId: row.id,
    invoiceName: typeof row.name === 'string' ? row.name : String(row.id),
    companyName: mapOdooMany2OneLabel(row.company_id),
    customerName: mapOdooMany2OneLabel(row.partner_id),
    invoiceDate: typeof row.invoice_date === 'string' ? row.invoice_date : undefined,
    amountTotal: typeof row.amount_total === 'number' ? row.amount_total : 0,
    verifactuState: mapVerifactuState(row.l10n_es_edi_verifactu_state, 'posted'),
  }))
}
