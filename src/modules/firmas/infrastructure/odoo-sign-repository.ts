import type { PendingSignatureRequest } from '@/src/modules/firmas/domain/types'
import {
  buildOdooSignPublicUrl,
  getOdooSignItemPendingStates,
  getOdooSignRequestActiveStates,
  getOdooSignRequestDueDateField,
  getOdooSignRequestItemModel,
  getOdooSignRequestModel,
} from '@/src/modules/firmas/infrastructure/firmas-env'
import {
  isOdooApiConfigured,
  mapOdooMany2OneLabel,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooSignRequestItemRow = {
  id: number
  sign_request_id?: [number, string] | false | null
  state?: string | false | null
  create_date?: string | false | null
}

type OdooSignRequestRow = {
  id: number
  reference?: string | false | null
  access_token?: string | false | null
  create_date?: string | false | null
  state?: string | false | null
  validity?: string | false | null
}

function parseOdooDateTime(
  value: string | false | null | undefined
): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  return value.trim()
}

function sanitizeReference(
  reference: string | false | null | undefined,
  fallbackLabel: string | undefined,
  requestId: number
): string {
  if (typeof reference === 'string' && reference.trim()) {
    return reference.trim()
  }
  if (fallbackLabel?.trim()) {
    return fallbackLabel.trim()
  }
  return `Solicitud ${requestId}`
}

function readOdooDueDate(
  row: OdooSignRequestRow,
  dueDateField: string
): string | undefined {
  const value = row[dueDateField as keyof OdooSignRequestRow]
  return parseOdooDateTime(
    typeof value === 'string' || value === false || value === null
      ? value
      : undefined
  )
}

export async function fetchPendingSignaturesFromOdoo(
  partnerId: number
): Promise<PendingSignatureRequest[]> {
  if (!isOdooApiConfigured()) {
    throw new Error('ODOO_NOT_CONFIGURED')
  }

  const itemModel = getOdooSignRequestItemModel()
  const requestModel = getOdooSignRequestModel()
  const dueDateField = getOdooSignRequestDueDateField()
  const itemPendingStates = getOdooSignItemPendingStates()
  const requestActiveStates = getOdooSignRequestActiveStates()

  const itemRows = await odooSearchRead<OdooSignRequestItemRow>(itemModel, {
    domain: [
      ['partner_id', '=', partnerId],
      ['state', 'in', itemPendingStates],
    ],
    fields: ['sign_request_id', 'state', 'create_date'],
    order: 'id desc',
    limit: 50,
  })

  const requestIds = [
    ...new Set(
      itemRows
        .map((row) =>
          Array.isArray(row.sign_request_id) ? row.sign_request_id[0] : null
        )
        .filter((id): id is number => typeof id === 'number' && id > 0)
    ),
  ]

  if (!requestIds.length) {
    return []
  }

  const requestRows = await odooSearchRead<OdooSignRequestRow>(requestModel, {
    domain: [
      ['id', 'in', requestIds],
      ['state', 'in', requestActiveStates],
    ],
    fields: ['reference', 'access_token', 'create_date', 'state', dueDateField],
    order: 'create_date desc, id desc',
    limit: 50,
  })

  const labelByRequestId = new Map<number, string>()
  const sentDateByRequestId = new Map<number, string>()

  for (const row of itemRows) {
    if (!Array.isArray(row.sign_request_id)) continue
    const [requestId] = row.sign_request_id
    labelByRequestId.set(
      requestId,
      mapOdooMany2OneLabel(row.sign_request_id) ?? `Solicitud ${requestId}`
    )

    const itemSentDate = parseOdooDateTime(row.create_date)
    if (itemSentDate) {
      sentDateByRequestId.set(requestId, itemSentDate)
    }
  }

  const pending: PendingSignatureRequest[] = []

  for (const row of requestRows) {
    const accessToken =
      typeof row.access_token === 'string' ? row.access_token : ''
    const signUrl = buildOdooSignPublicUrl(row.id, accessToken)
    if (!signUrl) continue

    const createDate =
      sentDateByRequestId.get(row.id) ??
      parseOdooDateTime(row.create_date)

    pending.push({
      id: row.id,
      reference: sanitizeReference(
        row.reference,
        labelByRequestId.get(row.id),
        row.id
      ),
      createDate,
      dueDate: readOdooDueDate(row, dueDateField),
      signUrl,
    })
  }

  return pending
}
