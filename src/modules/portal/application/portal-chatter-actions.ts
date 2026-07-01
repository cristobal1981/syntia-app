'use server'

import { updateTag } from 'next/cache'

import {
  isChatterHtmlEmpty,
  validateChatterHtmlBody,
} from '@/src/modules/portal/domain/filter-portal-messages'
import type {
  ListRecordMessagesInput,
  PortalChatterMessagesPageResult,
  PortalChatterPostResult,
  PostRecordMessageInput,
} from '@/src/modules/portal/domain/portal-chatter-types'
import { portalWatchStateKey } from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import { getSession } from '@/src/modules/auth/application/get-session'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { validateChatterUploadFiles } from '@/src/modules/portal/lib/chatter-attachment-validation'
import { tramitesSnapshotCacheTag } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import {
  canClientReplyOnRecord,
  getOdooModelForRecordKind,
  verifyClientRecordAccess,
} from '@/src/modules/portal/infrastructure/portal-record-access'
import {
  countAttachmentsByRecordIds,
  createAttachmentsForRecord,
} from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import { isOdooApiConfigured, resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'
import {
  listPortalMessagesPage,
  postRecordComment,
  verifyParentMessageBelongsToRecord,
} from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import {
  fetchWatchStateForUser,
  upsertWatchStateBatch,
} from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'
import { CHATTER_MESSAGE_MAX_LENGTH } from '@/src/modules/portal/infrastructure/portal-chatter-env'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

async function resolveClientPartnerId(): Promise<
  | { ok: true; partnerId: number; actorId: string }
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

  const actorId = await resolveDirectoryActorId(session.user)
  return { ok: true, partnerId, actorId }
}

function recordScopeFromKind(kind: PortalRecordKind): 'tramite' | 'consulta' {
  return kind === 'task' ? 'tramite' : 'consulta'
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

function parseParentId(parentId?: number): number | undefined {
  if (parentId === undefined) return undefined
  const value = Number(parentId)
  if (!Number.isInteger(value) || value <= 0) return undefined
  return value
}

async function advanceAttachmentWatchState(input: {
  actorId: string
  kind: PortalRecordKind
  recordId: number
  attachmentCount: number
}): Promise<void> {
  const scope = recordScopeFromKind(input.kind)
  const watchState = await fetchWatchStateForUser(input.actorId)
  const key = portalWatchStateKey(scope, input.recordId)
  const previous = watchState.get(key)

  await upsertWatchStateBatch(input.actorId, [
    {
      scope,
      recordId: input.recordId,
      lastState: previous?.lastState,
      lastIsClosed: previous?.lastIsClosed ?? false,
      lastAttachmentCount: input.attachmentCount,
      firmaDueSoonNotified: previous?.firmaDueSoonNotified ?? false,
      initialized: true,
    },
  ])
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
      verifyClientRecordAccess(input.kind, recordId, access.partnerId),
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
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
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

  const bodyEmpty = isChatterHtmlEmpty(input.body)
  const files = input.files ?? []

  if (bodyEmpty && !files.length) {
    return { ok: false, error: 'invalid_body' }
  }

  let htmlBody = ''
  if (!bodyEmpty) {
    const validated = validateChatterHtmlBody(input.body, CHATTER_MESSAGE_MAX_LENGTH)
    if (!validated.ok) {
      return { ok: false, error: 'invalid_body' }
    }
    htmlBody = validated.value
  }

  if (files.length) {
    const fileValidation = validateChatterUploadFiles(files)
    if (!fileValidation.ok) {
      return { ok: false, error: fileValidation.error }
    }
  }

  const parentId = parseParentId(input.parentId)

  try {
    const allowed = await verifyClientRecordAccess(
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

    const resModel = getOdooModelForRecordKind(input.kind)

    if (parentId) {
      const parentValid = await verifyParentMessageBelongsToRecord({
        parentId,
        resModel,
        recordId,
        clientPartnerId: access.partnerId,
      })
      if (!parentValid) {
        return { ok: false, error: 'invalid_parent' }
      }
    }

    const attachmentIds = files.length
      ? await createAttachmentsForRecord({
          resModel,
          resId: recordId,
          files,
        })
      : []

    const message = await postRecordComment({
      resModel,
      recordId,
      clientPartnerId: access.partnerId,
      htmlBody,
      parentId,
      attachmentIds,
    })

    let attachmentCount: number | undefined
    if (files.length) {
      updateTag(tramitesSnapshotCacheTag(access.partnerId))

      const counts = await countAttachmentsByRecordIds(resModel, [recordId])
      attachmentCount = counts.get(recordId) ?? files.length

      await advanceAttachmentWatchState({
        actorId: access.actorId,
        kind: input.kind,
        recordId,
        attachmentCount,
      })
    }

    return { ok: true, message, attachmentCount }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
