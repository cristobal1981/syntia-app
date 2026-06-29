'use server'

import { validateChatterHtmlBody } from '@/src/modules/portal/domain/filter-portal-messages'
import type {
  ListRecordMessagesInput,
  PortalChatterMessagesPageResult,
  PortalChatterPostResult,
  PostRecordMessageInput,
} from '@/src/modules/portal/domain/portal-chatter-types'
import { getSession } from '@/src/modules/auth/application/get-session'
import {
  canClientReplyOnRecord,
  getOdooModelForRecordKind,
  verifyRecordBelongsToPartner,
} from '@/src/modules/portal/infrastructure/portal-record-access'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import {
  listPortalMessagesPage,
  postRecordComment,
} from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import { CHATTER_MESSAGE_MAX_LENGTH } from '@/src/modules/portal/infrastructure/portal-chatter-env'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

async function resolveClientPartnerId(): Promise<
  | { ok: true; partnerId: number }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'odoo_unavailable' }
> {
  const session = await getSession()
  if (!session || session.user.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }

  const partnerId = await resolveClientOdooPartnerId(session.user)
  if (!partnerId) {
    return { ok: false, error: 'not_linked' }
  }

  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  return { ok: true, partnerId }
}

function parseRecordId(recordId: number): number | null {
  const value = Number(recordId)
  if (!Number.isInteger(value) || value <= 0) return null
  return value
}

function parseBeforeId(beforeId?: number): number | undefined {
  if (beforeId === undefined) return undefined
  const value = Number(beforeId)
  if (!Number.isInteger(value) || value <= 0) return undefined
  return value
}

export async function listRecordMessagesAction(
  input: ListRecordMessagesInput
): Promise<PortalChatterMessagesPageResult> {
  const access = await resolveClientPartnerId()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const recordId = parseRecordId(input.recordId)
  if (!recordId) {
    return { ok: false, error: 'not_found' }
  }

  try {
    const resModel = getOdooModelForRecordKind(input.kind)
    const beforeId = parseBeforeId(input.beforeId)

    const [allowed, page] = await Promise.all([
      verifyRecordBelongsToPartner(input.kind, recordId, access.partnerId),
      listPortalMessagesPage({
        resModel,
        recordId,
        clientPartnerId: access.partnerId,
        beforeId,
      }),
    ])

    if (!allowed) {
      return { ok: false, error: 'not_found' }
    }

    return {
      ok: true,
      messages: page.messages,
      hasMore: page.hasMore,
    }
  } catch {
    return { ok: false, error: 'odoo_unavailable' }
  }
}

export async function postRecordMessageAction(
  input: PostRecordMessageInput
): Promise<PortalChatterPostResult> {
  const access = await resolveClientPartnerId()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const recordId = parseRecordId(input.recordId)
  if (!recordId) {
    return { ok: false, error: 'not_found' }
  }

  const validated = validateChatterHtmlBody(input.body, CHATTER_MESSAGE_MAX_LENGTH)
  if (!validated.ok) {
    return { ok: false, error: 'invalid_body' }
  }

  try {
    const allowed = await verifyRecordBelongsToPartner(
      input.kind,
      recordId,
      access.partnerId
    )
    if (!allowed) {
      return { ok: false, error: 'not_found' }
    }

    const canReply = await canClientReplyOnRecord(input.kind, recordId)
    if (!canReply) {
      return { ok: false, error: 'read_only' }
    }

    const message = await postRecordComment({
      resModel: getOdooModelForRecordKind(input.kind),
      recordId,
      clientPartnerId: access.partnerId,
      htmlBody: validated.value,
    })

    return { ok: true, message }
  } catch {
    return { ok: false, error: 'odoo_unavailable' }
  }
}
