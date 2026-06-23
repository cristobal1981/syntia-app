import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import {
  filterOdooMailMessageRows,
  formatChatterBodyFromOdoo,
  isClientChatterAuthor,
  sanitizeChatterHtml,
  type OdooMailMessageRow,
} from '@/src/modules/portal/domain/filter-portal-messages'
import {
  getChatterExcludedPartnerIds,
  getChatterPageSize,
  shouldFilterInternalChatterMessages,
} from '@/src/modules/portal/infrastructure/portal-chatter-env'
import {
  mapOdooMany2OneId,
  mapOdooMany2OneLabel,
  odooCall,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

function buildMessageDomain(
  resModel: string,
  recordId: number,
  beforeId?: number
): unknown[] {
  const domain: unknown[] = [
    ['model', '=', resModel],
    ['res_id', '=', recordId],
    ['message_type', 'in', ['comment', 'email']],
  ]

  if (shouldFilterInternalChatterMessages()) {
    domain.push(['is_internal', '=', false])
  }

  if (typeof beforeId === 'number' && beforeId > 0) {
    domain.push(['id', '<', beforeId])
  }

  return domain
}

function mapOdooRowToPortalMessage(
  row: OdooMailMessageRow,
  clientPartnerId: number
): PortalChatterMessage | null {
  const body = typeof row.body === 'string' ? row.body : ''
  const date = typeof row.date === 'string' ? row.date : ''
  const authorId = mapOdooMany2OneId(row.author_id)
  const authorName = mapOdooMany2OneLabel(row.author_id) ?? 'Usuario'

  if (!body || !date || !row.id) return null

  return {
    id: row.id,
    bodyHtml: formatChatterBodyFromOdoo(body),
    date,
    authorName,
    isFromClient: isClientChatterAuthor(authorId, clientPartnerId),
  }
}

export async function listPortalMessagesPage(input: {
  resModel: string
  recordId: number
  clientPartnerId: number
  beforeId?: number
}): Promise<{ messages: PortalChatterMessage[]; hasMore: boolean }> {
  const pageSize = getChatterPageSize()
  const excludedPartnerIds = getChatterExcludedPartnerIds()
  const visible: OdooMailMessageRow[] = []
  let cursor = input.beforeId
  let exhausted = false

  while (visible.length <= pageSize && !exhausted) {
    const rows = await odooSearchRead<OdooMailMessageRow>('mail.message', {
      domain: buildMessageDomain(input.resModel, input.recordId, cursor),
      fields: ['body', 'date', 'author_id', 'message_type'],
      order: 'id desc',
      limit: Math.max(pageSize + 1, 20),
    })

    if (!rows.length) {
      exhausted = true
      break
    }

    const filtered = filterOdooMailMessageRows(rows, {
      clientPartnerId: input.clientPartnerId,
      excludedPartnerIds,
    })
    visible.push(...filtered)

    if (rows.length < Math.max(pageSize + 1, 20)) {
      exhausted = true
      break
    }

    const oldestRow = rows[rows.length - 1]
    if (!oldestRow?.id) {
      exhausted = true
      break
    }
    cursor = oldestRow.id
  }

  const hasMore = visible.length > pageSize || !exhausted
  const pageRows = visible.slice(0, pageSize)
  const messages = pageRows
    .map((row) => mapOdooRowToPortalMessage(row, input.clientPartnerId))
    .filter((message): message is PortalChatterMessage => message !== null)
    .reverse()

  return { messages, hasMore }
}

async function readPortalMessageById(
  messageId: number,
  clientPartnerId: number
): Promise<PortalChatterMessage> {
  const rows = await odooSearchRead<OdooMailMessageRow>('mail.message', {
    domain: [['id', '=', messageId]],
    fields: ['body', 'date', 'author_id', 'message_type'],
    limit: 1,
  })

  const mapped = rows[0]
    ? mapOdooRowToPortalMessage(rows[0], clientPartnerId)
    : null

  if (!mapped) {
    throw new Error('ODOO_MESSAGE_NOT_FOUND')
  }

  return mapped
}

export async function postRecordComment(input: {
  resModel: string
  recordId: number
  clientPartnerId: number
  htmlBody: string
}): Promise<PortalChatterMessage> {
  const body = sanitizeChatterHtml(input.htmlBody)

  const messageId = await odooCall<number>(input.resModel, 'message_post', {
    ids: [input.recordId],
    body,
    message_type: 'comment',
    subtype_xmlid: 'mail.mt_comment',
    author_id: input.clientPartnerId,
  })

  return readPortalMessageById(messageId, input.clientPartnerId)
}
