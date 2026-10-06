import type {
  CompletedSignatureRequest,
  PendingSignatureRequest,
} from '@/src/modules/firmas/domain/types'
import {
  buildOdooSignPublicUrl,
  getOdooSignItemDoneStates,
  getOdooSignItemPendingStates,
  getOdooSignRequestActiveStates,
  getOdooSignRequestDueDateField,
  getOdooSignRequestItemModel,
  getOdooSignRequestItemSignedDateField,
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
  access_token?: string | false | null
}

type OdooSignRequestRow = {
  id: number
  reference?: string | false | null
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
    fields: ['sign_request_id', 'state', 'create_date', 'access_token'],
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
    fields: ['reference', 'create_date', 'state', dueDateField],
    order: 'create_date desc, id desc',
    limit: 50,
  })

  const labelByRequestId = new Map<number, string>()
  const sentDateByRequestId = new Map<number, string>()
  const signUrlByRequestId = new Map<number, string>()

  for (const row of itemRows) {
    if (!Array.isArray(row.sign_request_id)) continue
    const [requestId] = row.sign_request_id
    if (!signUrlByRequestId.has(requestId)) {
      const itemAccessToken =
        typeof row.access_token === 'string' ? row.access_token : ''
      const signUrl = buildOdooSignPublicUrl(requestId, itemAccessToken)
      if (signUrl) {
        signUrlByRequestId.set(requestId, signUrl)
      }
    }

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
    const signUrl = signUrlByRequestId.get(row.id)
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

type OdooSignRequestHistoryItemRow = {
  id: number
  sign_request_id?: [number, string] | false | null
  [signedDateField: string]: unknown
}

type OdooSignRequestHistoryRow = {
  id: number
  reference?: string | false | null
  create_date?: string | false | null
  completed_document_attachment_ids?: number[] | false | null
}

function readOdooSignedDate(
  row: OdooSignRequestHistoryItemRow,
  signedDateField: string
): string | undefined {
  const value = row[signedDateField]
  return parseOdooDateTime(
    typeof value === 'string' || value === false || value === null
      ? value
      : undefined
  )
}

/**
 * El nombre del certificado de finalización de Odoo Sign varía con el idioma
 * ("Certificate of completion - ...", "Certificado de firma electrónica - ...")
 * pero siempre termina con el mismo sufijo de fecha/hora generado por Odoo —
 * ese sufijo es estable entre idiomas, el texto delante no lo es.
 */
const COMPLETION_CERTIFICATE_SUFFIX_PATTERN =
  / - \d{4}-\d{2}-\d{2} - \d{2}:\d{2}:\d{2}\.pdf$/i

async function fetchAttachmentNamesByIds(
  attachmentIds: number[]
): Promise<Map<number, string>> {
  const names = new Map<number, string>()
  if (!attachmentIds.length) return names

  const rows = await odooSearchRead<{ id: number; name?: string | false | null }>(
    'ir.attachment',
    {
      domain: [['id', 'in', attachmentIds]],
      fields: ['name'],
      limit: attachmentIds.length,
    }
  )

  for (const row of rows) {
    if (typeof row.name === 'string') {
      names.set(row.id, row.name)
    }
  }

  return names
}

/**
 * De entre los adjuntos completados de una solicitud, separa el documento
 * real del certificado de finalización: el documento se identifica primero
 * por coincidencia exacta con la referencia de la solicitud, si no por NO
 * tener el sufijo de fecha del certificado; el certificado es el que sí lo
 * tiene.
 */
function pickSignatureAttachments(
  completedIds: number[],
  reference: string | false | null | undefined,
  namesById: Map<number, string>
): { documentAttachmentId?: number; certificateAttachmentId?: number } {
  const certificateAttachmentId = completedIds.find((id) => {
    const name = namesById.get(id)
    return name !== undefined && COMPLETION_CERTIFICATE_SUFFIX_PATTERN.test(name)
  })

  if (typeof reference === 'string' && reference.trim()) {
    const exactMatch = completedIds.find(
      (id) => namesById.get(id) === reference.trim()
    )
    if (exactMatch !== undefined) {
      return { documentAttachmentId: exactMatch, certificateAttachmentId }
    }
  }

  const documentAttachmentId = completedIds.find(
    (id) => id !== certificateAttachmentId && namesById.has(id)
  )

  return { documentAttachmentId, certificateAttachmentId }
}

export async function fetchSignatureHistoryFromOdoo(
  partnerId: number
): Promise<CompletedSignatureRequest[]> {
  if (!isOdooApiConfigured()) {
    throw new Error('ODOO_NOT_CONFIGURED')
  }

  const itemModel = getOdooSignRequestItemModel()
  const requestModel = getOdooSignRequestModel()
  const itemDoneStates = getOdooSignItemDoneStates()
  const signedDateField = getOdooSignRequestItemSignedDateField()

  const itemRows = await odooSearchRead<OdooSignRequestHistoryItemRow>(
    itemModel,
    {
      domain: [
        ['partner_id', '=', partnerId],
        ['state', 'in', itemDoneStates],
      ],
      fields: ['sign_request_id', signedDateField],
      order: `${signedDateField} desc, id desc`,
      limit: 50,
    }
  )

  const signedDateByRequestId = new Map<number, string>()
  for (const row of itemRows) {
    if (!Array.isArray(row.sign_request_id)) continue
    const [requestId] = row.sign_request_id
    const signedDate = readOdooSignedDate(row, signedDateField)
    if (signedDate && !signedDateByRequestId.has(requestId)) {
      signedDateByRequestId.set(requestId, signedDate)
    }
  }

  const requestIds = [...signedDateByRequestId.keys()]
  if (!requestIds.length) {
    return []
  }

  const requestRows = await odooSearchRead<OdooSignRequestHistoryRow>(
    requestModel,
    {
      domain: [['id', 'in', requestIds]],
      fields: ['reference', 'create_date', 'completed_document_attachment_ids'],
      limit: requestIds.length,
    }
  )

  const allCompletedAttachmentIds = requestRows.flatMap((row) =>
    Array.isArray(row.completed_document_attachment_ids)
      ? row.completed_document_attachment_ids
      : []
  )
  const attachmentNamesById = await fetchAttachmentNamesByIds(
    allCompletedAttachmentIds
  )

  const history: CompletedSignatureRequest[] = requestRows.map((row) => {
    const completedIds = Array.isArray(row.completed_document_attachment_ids)
      ? row.completed_document_attachment_ids
      : []
    const { documentAttachmentId, certificateAttachmentId } = pickSignatureAttachments(
      completedIds,
      row.reference,
      attachmentNamesById
    )
    return {
      id: row.id,
      reference: sanitizeReference(row.reference, undefined, row.id),
      signedDate: signedDateByRequestId.get(row.id),
      documentAttachmentId,
      certificateAttachmentId,
    }
  })

  history.sort((a, b) => (a.signedDate && b.signedDate
    ? b.signedDate.localeCompare(a.signedDate)
    : 0))

  return history
}
