import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import type {
  PortalChatterAttachmentRef,
  PortalChatterMessage,
} from '@/src/modules/portal/domain/portal-chatter-types'
import { chatterReadStateKey } from '@/src/modules/portal/domain/chatter-notifications-types'
import {
  filterOdooMailMessageRows,
  formatChatterBodyFromOdoo,
  hasVisibleMessageBody,
  isClientChatterAuthor,
  sanitizeChatterHtml,
  type OdooMailMessageRow,
} from '@/src/modules/portal/domain/filter-portal-messages'
import {
  getChatterExcludedPartnerIds,
  getChatterNotificationsBatchLimit,
  getChatterPageSize,
  shouldFilterInternalChatterMessages,
} from '@/src/modules/portal/infrastructure/portal-chatter-env'
import { resolveChatterCommentSubtypeId } from '@/src/modules/portal/infrastructure/odoo-chatter-subtype'
import {
  mapOdooMany2OneId,
  mapOdooMany2OneLabel,
  odooCall,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'
import { resolveAttachmentMetaByIds } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import type { PortalAttachment } from '@/src/modules/portal/domain/portal-record-types'
import { parseOdooDateTime } from '@/src/modules/tramites/domain/parse-odoo-datetime'

type OdooMailMessageBatchRow = OdooMailMessageRow & {
  res_id?: number | false | null
}

function buildBatchMessageDomain(
  resModel: string,
  recordIds: number[],
  afterId?: number
): unknown[] {
  const domain: unknown[] = [
    ['model', '=', resModel],
    ['res_id', 'in', recordIds],
    ['message_type', 'in', ['comment', 'email']],
  ]

  if (shouldFilterInternalChatterMessages()) {
    domain.push(['is_internal', '=', false])
    domain.push(['subtype_id.internal', '=', false])
  }

  if (typeof afterId === 'number' && afterId > 0) {
    domain.push(['id', '>', afterId])
  }

  return domain
}

function buildMessageDomain(
  resModel: string,
  recordId: number,
  options?: { beforeId?: number; afterId?: number }
): unknown[] {
  const domain: unknown[] = [
    ['model', '=', resModel],
    ['res_id', '=', recordId],
    ['message_type', 'in', ['comment', 'email']],
  ]

  if (shouldFilterInternalChatterMessages()) {
    domain.push(['is_internal', '=', false])
    domain.push(['subtype_id.internal', '=', false])
  }

  if (typeof options?.beforeId === 'number' && options.beforeId > 0) {
    domain.push(['id', '<', options.beforeId])
  }

  if (typeof options?.afterId === 'number' && options.afterId > 0) {
    domain.push(['id', '>', options.afterId])
  }

  return domain
}

function mapOdooAttachmentIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is number => typeof id === 'number' && id > 0)
}

function mapOdooRowToPortalMessage(
  row: OdooMailMessageRow,
  clientPartnerId: number,
  attachmentMeta: Map<number, PortalAttachment>
): PortalChatterMessage | null {
  const body = typeof row.body === 'string' ? row.body : ''
  const date = typeof row.date === 'string' ? row.date : ''
  const authorId = mapOdooMany2OneId(row.author_id)
  const authorName = mapOdooMany2OneLabel(row.author_id) ?? 'Usuario'
  const isFromClient = isClientChatterAuthor(authorId, clientPartnerId)
  const attachmentIds = mapOdooAttachmentIdList(row.attachment_ids)
  const hasBody = hasVisibleMessageBody(body)

  if ((!hasBody && !attachmentIds.length) || !date || !row.id) return null

  const attachments: PortalChatterAttachmentRef[] = attachmentIds
    .map((id) => {
      const meta = attachmentMeta.get(id)
      if (!meta?.name) return null
      return {
        id,
        name: meta.name,
        ...(meta.mimetype ? { mimetype: meta.mimetype } : {}),
        ...(meta.fileSize !== undefined ? { fileSize: meta.fileSize } : {}),
      }
    })
    .filter((attachment): attachment is PortalChatterAttachmentRef => attachment !== null)

  return {
    id: row.id,
    bodyHtml: hasBody ? formatChatterBodyFromOdoo(body) : '',
    date: parseOdooDateTime(date) || date,
    authorName,
    ...(isFromClient || !authorId ? {} : { authorPartnerId: authorId }),
    isFromClient,
    ...(mapOdooMany2OneId(row.parent_id)
      ? { parentId: mapOdooMany2OneId(row.parent_id) }
      : {}),
    ...(attachments.length ? { attachments } : {}),
  }
}

async function resolveAttachmentMetaForRows(
  rows: OdooMailMessageRow[]
): Promise<Map<number, PortalAttachment>> {
  const ids = new Set<number>()
  for (const row of rows) {
    for (const id of mapOdooAttachmentIdList(row.attachment_ids)) {
      ids.add(id)
    }
  }
  if (!ids.size) return new Map()
  return resolveAttachmentMetaByIds([...ids])
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
      domain: buildMessageDomain(input.resModel, input.recordId, { beforeId: cursor }),
      fields: ['body', 'date', 'author_id', 'message_type', 'parent_id', 'attachment_ids'],
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
  const attachmentMeta = await resolveAttachmentMetaForRows(pageRows)
  const messages = pageRows
    .map((row) => mapOdooRowToPortalMessage(row, input.clientPartnerId, attachmentMeta))
    .filter((message): message is PortalChatterMessage => message !== null)
    .reverse()

  return { messages, hasMore }
}

/**
 * Trae solo los mensajes posteriores a `afterId` para un registro. Pensado
 * para refrescar un chat ya abierto sin repetir toda la conversación:
 * se dispara puntualmente cuando el poll de novedades (que ya corre igual)
 * detecta un mensaje nuevo para ese registro, no en cada tick.
 */
export async function listNewerPortalMessages(input: {
  resModel: string
  recordId: number
  clientPartnerId: number
  afterId: number
}): Promise<PortalChatterMessage[]> {
  const excludedPartnerIds = getChatterExcludedPartnerIds()

  const rows = await odooSearchRead<OdooMailMessageRow>('mail.message', {
    domain: buildMessageDomain(input.resModel, input.recordId, {
      afterId: input.afterId,
    }),
    fields: ['body', 'date', 'author_id', 'message_type', 'parent_id', 'attachment_ids'],
    order: 'id asc',
    limit: 50,
  })

  if (!rows.length) return []

  const filtered = filterOdooMailMessageRows(rows, {
    clientPartnerId: input.clientPartnerId,
    excludedPartnerIds,
  })

  const attachmentMeta = await resolveAttachmentMetaForRows(filtered)
  return filtered
    .map((row) => mapOdooRowToPortalMessage(row, input.clientPartnerId, attachmentMeta))
    .filter((message): message is PortalChatterMessage => message !== null)
}

async function readPortalMessageById(
  messageId: number,
  clientPartnerId: number
): Promise<PortalChatterMessage> {
  const rows = await odooSearchRead<OdooMailMessageRow>('mail.message', {
    domain: [['id', '=', messageId]],
    fields: ['body', 'date', 'author_id', 'message_type', 'parent_id', 'attachment_ids'],
    limit: 1,
  })

  const attachmentMeta = await resolveAttachmentMetaForRows(rows)
  const mapped = rows[0]
    ? mapOdooRowToPortalMessage(rows[0], clientPartnerId, attachmentMeta)
    : null

  if (!mapped) {
    throw new Error('ODOO_MESSAGE_NOT_FOUND')
  }

  return mapped
}

function buildPostedPortalMessage(input: {
  messageId: number
  htmlBody: string
  clientPartnerId: number
  parentId?: number
  attachmentRefs?: PortalChatterAttachmentRef[]
}): PortalChatterMessage {
  const body = sanitizeChatterHtml(input.htmlBody)
  const hasBody = hasVisibleMessageBody(body)

  return {
    id: input.messageId,
    bodyHtml: hasBody ? formatChatterBodyFromOdoo(body) : '',
    date: new Date().toISOString(),
    authorName: '',
    isFromClient: true,
    ...(input.parentId ? { parentId: input.parentId } : {}),
    ...(input.attachmentRefs?.length ? { attachments: input.attachmentRefs } : {}),
  }
}

function parseMessagePostResult(result: unknown): number | null {
  if (typeof result === 'number' && result > 0) return result
  if (Array.isArray(result)) {
    const first = result[0]
    if (typeof first === 'number' && first > 0) return first
    if (first && typeof first === 'object' && 'id' in first) {
      const id = (first as { id?: unknown }).id
      if (typeof id === 'number' && id > 0) return id
    }
  }
  if (result && typeof result === 'object' && 'id' in result) {
    const id = (result as { id?: unknown }).id
    if (typeof id === 'number' && id > 0) return id
  }
  return null
}

export async function verifyParentMessageBelongsToRecord(input: {
  parentId: number
  resModel: string
  recordId: number
  clientPartnerId: number
}): Promise<boolean> {
  const excludedPartnerIds = getChatterExcludedPartnerIds()
  const rows = await odooSearchRead<OdooMailMessageRow>('mail.message', {
    domain: [
      ['id', '=', input.parentId],
      ['model', '=', input.resModel],
      ['res_id', '=', input.recordId],
    ],
    fields: ['body', 'date', 'author_id', 'message_type', 'attachment_ids'],
    limit: 1,
  })

  const filtered = filterOdooMailMessageRows(rows, {
    clientPartnerId: input.clientPartnerId,
    excludedPartnerIds,
  })

  return filtered.length === 1
}

export async function postRecordComment(input: {
  resModel: string
  recordId: number
  clientPartnerId: number
  htmlBody: string
  parentId?: number
  attachmentIds?: number[]
  attachmentRefs?: PortalChatterAttachmentRef[]
  notifyPartnerIds?: number[]
}): Promise<PortalChatterMessage> {
  const body = sanitizeChatterHtml(input.htmlBody)
  const subtypeId = await resolveChatterCommentSubtypeId()
  const notifyPartnerIds = (input.notifyPartnerIds ?? []).filter(
    (partnerId) => Number.isInteger(partnerId) && partnerId > 0
  )

  const postPayload: Record<string, unknown> = {
    ids: [input.recordId],
    context: {
      mail_post_autofollow_author_skip: true,
      mail_create_nosubscribe: true,
    },
    body: body || '<p></p>',
    message_type: 'comment',
    subtype_id: subtypeId,
    author_id: input.clientPartnerId,
    body_is_html: true,
    notify_skip_followers: true,
    partner_ids: notifyPartnerIds,
    ...(input.parentId ? { parent_id: input.parentId } : { parent_id: false }),
    ...(input.attachmentIds?.length ? { attachment_ids: input.attachmentIds } : {}),
  }

  const posted = await odooCall<unknown>(input.resModel, 'message_post', postPayload)
  const messageId = parseMessagePostResult(posted)

  if (!messageId) {
    throw new Error('ODOO_MESSAGE_POST_FAILED')
  }

  return buildPostedPortalMessage({
    messageId,
    htmlBody: input.htmlBody,
    clientPartnerId: input.clientPartnerId,
    parentId: input.parentId,
    attachmentRefs: input.attachmentRefs,
  })
}

export type ChatterUnreadCandidate = {
  recordKind: PortalRecordKind
  recordId: number
  latestMessageId: number
  latestDate: string
}

export type ChatterReadStateBootstrap = {
  recordKind: PortalRecordKind
  recordId: number
  lastSeenMessageId: number
}

export async function findUnreadChatterCandidatesForRecords(input: {
  groups: Array<{
    resModel: string
    recordKind: PortalRecordKind
    records: Array<{ recordId: number }>
  }>
  readState: Map<string, number>
  clientPartnerId: number
}): Promise<{
  unread: ChatterUnreadCandidate[]
  bootstrapUpdates: ChatterReadStateBootstrap[]
}> {
  const excludedPartnerIds = getChatterExcludedPartnerIds()
  const batchLimit = getChatterNotificationsBatchLimit()
  const unread: ChatterUnreadCandidate[] = []
  const bootstrapUpdates: ChatterReadStateBootstrap[] = []

  for (const group of input.groups) {
    const recordIds = group.records.map((record) => record.recordId)
    if (!recordIds.length) continue

    const knownLastSeen = group.records
      .map((record) =>
        input.readState.get(chatterReadStateKey(group.recordKind, record.recordId))
      )
      .filter((value): value is number => typeof value === 'number')

    const minKnownLastSeen =
      knownLastSeen.length > 0 ? Math.min(...knownLastSeen) : undefined

    const rows = await odooSearchRead<OdooMailMessageBatchRow>('mail.message', {
      domain: buildBatchMessageDomain(group.resModel, recordIds, minKnownLastSeen),
      fields: ['id', 'res_id', 'body', 'date', 'author_id', 'message_type'],
      order: 'id desc',
      limit: batchLimit,
    })

    const filtered = filterOdooMailMessageRows(rows, {
      clientPartnerId: input.clientPartnerId,
      excludedPartnerIds,
    })
    const filteredIds = new Set(filtered.map((row) => row.id))

    const rowsByRecord = new Map<number, OdooMailMessageBatchRow[]>()
    for (const row of rows) {
      if (!filteredIds.has(row.id)) continue
      const resId = typeof row.res_id === 'number' ? row.res_id : null
      if (!resId) continue
      const bucket = rowsByRecord.get(resId) ?? []
      bucket.push(row)
      rowsByRecord.set(resId, bucket)
    }

    for (const record of group.records) {
      const key = chatterReadStateKey(group.recordKind, record.recordId)
      const lastSeen = input.readState.get(key)
      const recordRows = rowsByRecord.get(record.recordId) ?? []

      if (!recordRows.length) {
        continue
      }

      const maxVisibleId = Math.max(...recordRows.map((row) => row.id))

      if (lastSeen === undefined) {
        // El baseline recién creado evita marcar como "sin leer" el propio
        // primer mensaje del cliente en un registro que nunca tuvo lectura
        // — pero si quien escribió primero fue el asesor (el cliente nunca
        // abrió esto y ya tiene algo pendiente), el baseline se ancla justo
        // antes de ese mensaje en vez de al final: así sigue apareciendo
        // como "sin leer" en los polls siguientes en lugar de desaparecer
        // solo tras el primer aviso, hasta que el cliente abra de verdad
        // la conversación.
        const latestFromGestorOnFirstSeen = recordRows.find((row) => {
          const authorId = mapOdooMany2OneId(row.author_id)
          return !isClientChatterAuthor(authorId, input.clientPartnerId)
        })

        if (latestFromGestorOnFirstSeen) {
          bootstrapUpdates.push({
            recordKind: group.recordKind,
            recordId: record.recordId,
            lastSeenMessageId: latestFromGestorOnFirstSeen.id - 1,
          })

          unread.push({
            recordKind: group.recordKind,
            recordId: record.recordId,
            latestMessageId: latestFromGestorOnFirstSeen.id,
            latestDate:
              typeof latestFromGestorOnFirstSeen.date === 'string'
                ? parseOdooDateTime(latestFromGestorOnFirstSeen.date) ||
                  latestFromGestorOnFirstSeen.date
                : '',
          })
        } else {
          bootstrapUpdates.push({
            recordKind: group.recordKind,
            recordId: record.recordId,
            lastSeenMessageId: maxVisibleId,
          })
        }

        continue
      }

      const latestFromGestor = recordRows.find((row) => {
        if (row.id <= lastSeen) return false
        const authorId = mapOdooMany2OneId(row.author_id)
        return !isClientChatterAuthor(authorId, input.clientPartnerId)
      })

      if (!latestFromGestor) continue

      const latestDate =
        typeof latestFromGestor.date === 'string'
          ? parseOdooDateTime(latestFromGestor.date) || latestFromGestor.date
          : ''

      unread.push({
        recordKind: group.recordKind,
        recordId: record.recordId,
        latestMessageId: latestFromGestor.id,
        latestDate,
      })
    }
  }

  return { unread, bootstrapUpdates }
}
