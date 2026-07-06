import {
  mapAccountMoveToInvoice,
  type OdooAccountMoveRow,
} from '@/src/modules/facturacion/domain/map-account-move'
import type {
  Invoice,
  InvoiceDraftInput,
} from '@/src/modules/facturacion/domain/types'
import { getFacturacionEmitTimeoutMs, isOdooVerifactuEnabled } from '@/src/modules/facturacion/infrastructure/facturacion-env'
import {
  odooCall,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

/**
 * Repositorio de facturas de cliente (account.move) del SIF Odoo.
 *
 * Inalterabilidad (§4.6 RRSIF): este repositorio NO expone `write`/`unlink` sobre
 * facturas; una vez posteada, cualquier corrección pasa por rectificativa
 * (`createReversal`) o anulación Verifactu (`requestCancellation`).
 */

const BASE_FIELDS = [
  'name',
  'state',
  'partner_id',
  'invoice_date',
  'amount_untaxed',
  'amount_tax',
  'amount_total',
]

const VERIFACTU_FIELDS = ['l10n_es_edi_verifactu_state']

export const FACTURACION_ERROR = {
  PDF_NOT_FOUND: 'FACTURACION_PDF_NOT_FOUND',
  SEND_FAILED: 'FACTURACION_VERIFACTU_SEND_FAILED',
  CREATE_FAILED: 'FACTURACION_CREATE_FAILED',
} as const

function parseCreatedId(created: number | number[]): number | null {
  if (typeof created === 'number' && created > 0) return created
  if (Array.isArray(created) && typeof created[0] === 'number' && created[0] > 0) {
    return created[0]
  }
  return null
}

async function searchMoves(
  companyId: number,
  domain: unknown[],
  limit: number
): Promise<OdooAccountMoveRow[]> {
  const fullDomain = [['company_id', '=', companyId], ...domain]
  const fields = isOdooVerifactuEnabled()
    ? [...BASE_FIELDS, ...VERIFACTU_FIELDS]
    : BASE_FIELDS

  return odooSearchRead<OdooAccountMoveRow>('account.move', {
    domain: fullDomain,
    fields,
    order: 'invoice_date desc, id desc',
    limit,
    companyId,
  })
}

export async function listInvoices(
  companyId: number,
  options: { limit?: number } = {}
): Promise<Invoice[]> {
  const rows = await searchMoves(
    companyId,
    [['move_type', '=', 'out_invoice']],
    options.limit ?? 100
  )
  return rows.map(mapAccountMoveToInvoice)
}

export async function getInvoice(
  companyId: number,
  moveId: number
): Promise<Invoice | null> {
  const rows = await searchMoves(
    companyId,
    [
      ['id', '=', moveId],
      ['move_type', 'in', ['out_invoice', 'out_refund']],
    ],
    1
  )
  const row = rows[0]
  return row ? mapAccountMoveToInvoice(row) : null
}

async function resolveCustomerPartnerId(
  companyId: number,
  customer: InvoiceDraftInput['customer']
): Promise<number> {
  if (typeof customer.partnerId === 'number' && customer.partnerId > 0) {
    return customer.partnerId
  }

  const name = customer.name?.trim()
  const vat = customer.vat?.trim()

  if (vat) {
    const existing = await odooSearchRead<{ id: number }>('res.partner', {
      domain: [
        ['vat', '=', vat],
        '|',
        ['company_id', '=', companyId],
        ['company_id', '=', false],
      ],
      fields: ['id'],
      limit: 1,
      companyId,
    })
    if (existing[0]?.id) {
      return existing[0].id
    }
  }

  const created = await odooCall<number | number[]>(
    'res.partner',
    'create',
    {
      vals_list: [
        {
          name,
          ...(vat ? { vat } : {}),
          company_id: companyId,
        },
      ],
    },
    { companyId }
  )

  const partnerId = parseCreatedId(created)
  if (!partnerId) {
    throw new Error(FACTURACION_ERROR.CREATE_FAILED)
  }
  return partnerId
}

export async function createDraftInvoice(
  companyId: number,
  input: InvoiceDraftInput
): Promise<number> {
  const partnerId = await resolveCustomerPartnerId(companyId, input.customer)

  const created = await odooCall<number | number[]>(
    'account.move',
    'create',
    {
      vals_list: [
        {
          move_type: 'out_invoice',
          partner_id: partnerId,
          company_id: companyId,
          invoice_line_ids: input.lines.map((line) => [
            0,
            0,
            {
              name: line.description.trim(),
              quantity: line.quantity,
              price_unit: line.priceUnit,
            },
          ]),
        },
      ],
    },
    { companyId }
  )

  const moveId = parseCreatedId(created)
  if (!moveId) {
    throw new Error(FACTURACION_ERROR.CREATE_FAILED)
  }
  return moveId
}

/**
 * Encola el registro Verifactu vía Send & Print (D2 del plan: `action_post` NO lo
 * dispara). La secuencia exacta depende de la versión de Odoo — confirmar en el
 * runbook C2 (`verifactu-odoo-runbook.md`). Se intentan las variantes conocidas.
 */
async function triggerVerifactuSend(
  companyId: number,
  moveId: number,
  timeoutMs: number
): Promise<boolean> {
  const attempts: Array<() => Promise<void>> = [
    // Odoo >= 18.2: wizard individual account.move.send.wizard
    async () => {
      const created = await odooCall<number | number[]>(
        'account.move.send.wizard',
        'create',
        { vals_list: [{ move_id: moveId }] },
        { companyId, timeoutMs }
      )
      const wizardId = parseCreatedId(created)
      if (!wizardId) throw new Error(FACTURACION_ERROR.SEND_FAILED)
      await odooCall(
        'account.move.send.wizard',
        'action_send_and_print',
        { ids: [wizardId] },
        { companyId, timeoutMs }
      )
    },
    // Odoo 17/18.0: wizard account.move.send con move_ids
    async () => {
      const created = await odooCall<number | number[]>(
        'account.move.send',
        'create',
        { vals_list: [{ move_ids: [[6, 0, [moveId]]] }] },
        { companyId, timeoutMs }
      )
      const wizardId = parseCreatedId(created)
      if (!wizardId) throw new Error(FACTURACION_ERROR.SEND_FAILED)
      await odooCall(
        'account.move.send',
        'action_send_and_print',
        { ids: [wizardId] },
        { companyId, timeoutMs }
      )
    },
  ]

  for (const attempt of attempts) {
    try {
      await attempt()
      return true
    } catch {
      continue
    }
  }
  return false
}

/**
 * Único punto de emisión de facturas (R3 del plan): postea y encola el envío
 * Verifactu. Devuelve `verifactuQueued=false` si el post funcionó pero el
 * disparo del envío falló (la factura queda emitida y hay que reintentar el envío).
 */
export async function postAndSendInvoice(
  companyId: number,
  moveId: number
): Promise<{ verifactuQueued: boolean }> {
  const timeoutMs = getFacturacionEmitTimeoutMs()

  await odooCall(
    'account.move',
    'action_post',
    { ids: [moveId] },
    { companyId, timeoutMs }
  )

  const verifactuQueued = await triggerVerifactuSend(companyId, moveId, timeoutMs)
  return { verifactuQueued }
}

/** Reintento del encolado Verifactu para facturas ya posteadas. */
export async function retryVerifactuSend(
  companyId: number,
  moveId: number
): Promise<boolean> {
  return triggerVerifactuSend(companyId, moveId, getFacturacionEmitTimeoutMs())
}

export type ReversalMode = 'refund' | 'modify'

/**
 * Rectificativa vía wizard account.move.reversal: `refund` = por diferencias,
 * `modify` = por sustitución. Nombres de método según versión (confirmar en C2).
 */
export async function createReversal(
  companyId: number,
  moveId: number,
  options: { mode: ReversalMode; reason?: string }
): Promise<void> {
  const timeoutMs = getFacturacionEmitTimeoutMs()

  const created = await odooCall<number | number[]>(
    'account.move.reversal',
    'create',
    {
      vals_list: [
        {
          move_ids: [[6, 0, [moveId]]],
          ...(options.reason ? { reason: options.reason } : {}),
        },
      ],
    },
    { companyId, timeoutMs }
  )

  const wizardId = parseCreatedId(created)
  if (!wizardId) {
    throw new Error(FACTURACION_ERROR.CREATE_FAILED)
  }

  const methods =
    options.mode === 'modify'
      ? ['modify_moves']
      : ['refund_moves', 'reverse_moves']

  for (const method of methods) {
    try {
      await odooCall('account.move.reversal', method, { ids: [wizardId] }, {
        companyId,
        timeoutMs,
      })
      return
    } catch {
      continue
    }
  }

  throw new Error(FACTURACION_ERROR.CREATE_FAILED)
}

/** Anulación Verifactu (registro de anulación) sobre una factura registrada. */
export async function requestCancellation(
  companyId: number,
  moveId: number
): Promise<void> {
  await odooCall(
    'account.move',
    'l10n_es_edi_verifactu_button_cancel',
    { ids: [moveId] },
    { companyId, timeoutMs: getFacturacionEmitTimeoutMs() }
  )
}

/** PDF (con QR + leyenda generados por Odoo) adjunto a la factura. */
export async function fetchInvoicePdf(
  companyId: number,
  moveId: number
): Promise<{ filename: string; mimetype: string; dataBase64: string }> {
  const rows = await odooSearchRead<{
    id: number
    name: string
    mimetype?: string | false | null
    datas?: string | false | null
  }>('ir.attachment', {
    domain: [
      ['res_model', '=', 'account.move'],
      ['res_id', '=', moveId],
      ['mimetype', '=', 'application/pdf'],
    ],
    fields: ['name', 'mimetype', 'datas'],
    order: 'id desc',
    limit: 1,
    companyId,
  })

  const row = rows[0]
  if (!row || typeof row.datas !== 'string' || !row.datas) {
    throw new Error(FACTURACION_ERROR.PDF_NOT_FOUND)
  }

  return {
    filename: row.name,
    mimetype: typeof row.mimetype === 'string' ? row.mimetype : 'application/pdf',
    dataBase64: row.datas,
  }
}
