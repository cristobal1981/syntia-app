import {
  getOdooSignItemPendingStates,
  getOdooSignRequestActiveStates,
  getOdooSignRequestDueDateField,
  getOdooSignRequestItemModel,
  getOdooSignRequestModel,
} from '@/src/modules/firmas/infrastructure/firmas-env'
import { SIGNATURE_DUE_SOON_DAYS } from '@/src/modules/firmas/domain/signature-due-date'
import type { DueSoonSignItem } from '@/src/modules/push/domain/firma-due-soon'
import { mapOdooMany2OneId, odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

type Many2One = [number, string] | false | null | undefined

type RequestRow = {
  id: number
  reference?: string | false
  [field: string]: unknown
}

type ItemRow = {
  sign_request_id?: Many2One
  partner_id?: Many2One
}

const DAY_MS = 24 * 60 * 60 * 1000

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Firmantes pendientes de solicitudes activas que vencen entre hoy y dentro de
 * `SIGNATURE_DUE_SOON_DAYS` días: dos consultas globales a Odoo (no una por cliente).
 */
export async function fetchDueSoonSignItems(now: Date = new Date()): Promise<DueSoonSignItem[]> {
  const dueField = getOdooSignRequestDueDateField()
  // Un día de margen por cada lado: la decisión exacta la toma `isSignatureDueSoon`.
  const from = toDateOnly(new Date(now.getTime() - DAY_MS))
  const to = toDateOnly(new Date(now.getTime() + (SIGNATURE_DUE_SOON_DAYS + 1) * DAY_MS))

  const requests = await odooSearchRead<RequestRow>(getOdooSignRequestModel(), {
    domain: [
      ['state', 'in', getOdooSignRequestActiveStates()],
      [dueField, '>=', from],
      [dueField, '<=', to],
    ],
    fields: ['reference', dueField],
    order: 'id asc',
    limit: 500,
  })

  const byId = new Map<number, { reference: string; dueDate: string }>()
  for (const row of requests) {
    const due = row[dueField]
    if (typeof due !== 'string' || !due) continue
    byId.set(row.id, { reference: (row.reference || '').toString(), dueDate: due })
  }
  if (byId.size === 0) return []

  const items = await odooSearchRead<ItemRow>(getOdooSignRequestItemModel(), {
    domain: [
      ['sign_request_id', 'in', [...byId.keys()]],
      ['state', 'in', getOdooSignItemPendingStates()],
      ['partner_id', '!=', false],
    ],
    fields: ['sign_request_id', 'partner_id'],
    order: 'id asc',
    limit: 2000,
  })

  const result: DueSoonSignItem[] = []
  for (const item of items) {
    const requestId = mapOdooMany2OneId(item.sign_request_id)
    const partnerId = mapOdooMany2OneId(item.partner_id)
    const request = requestId === undefined ? undefined : byId.get(requestId)
    if (requestId === undefined || partnerId === undefined || !request) continue
    result.push({
      requestId,
      reference: request.reference || `Solicitud ${requestId}`,
      dueDate: request.dueDate,
      partnerId,
    })
  }
  return result
}
