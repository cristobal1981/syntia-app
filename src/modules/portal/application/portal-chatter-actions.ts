'use server'

import { after } from 'next/server'
import { updateTag } from 'next/cache'

import { portalChatter } from '@/content/portal-chatter'

import {
  isChatterHtmlEmpty,
  validateChatterHtmlBody,
} from '@/src/modules/portal/domain/filter-portal-messages'
import type {
  ListNewerRecordMessagesInput,
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
import {
  chatterUnreadBatchCacheTag,
  tramitesSnapshotCacheTag,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
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
  listNewerPortalMessages,
  listPortalMessagesPage,
  postRecordComment,
  verifyParentMessageBelongsToRecord,
} from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import {
  fetchChatterReplyLinks,
  recordChatterReplyLink,
} from '@/src/modules/portal/infrastructure/portal-chatter-reply-links.supabase'
import {
  fetchWatchStateForUser,
  upsertWatchStateBatch,
} from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
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

/** A diferencia de beforeId, 0 es válido: "sin cota inferior" (chat vacío). */
function parseAfterId(afterId: number): number | null {
  const value = Number(afterId)
  if (!Number.isInteger(value) || value < 0) return null
  return value
}

function parseParentId(parentId?: number): number | undefined {
  if (parentId === undefined) return undefined
  const value = Number(parentId)
  if (!Number.isInteger(value) || value <= 0) return undefined
  return value
}

function sanitizeNotifyPartnerIds(partnerIds: number[] | undefined): number[] {
  if (!partnerIds?.length) return []
  return [
    ...new Set(
      partnerIds.filter((partnerId) => Number.isInteger(partnerId) && partnerId > 0)
    ),
  ]
}

function stripUntrustedParentId(message: PortalChatterMessage): PortalChatterMessage {
  if (!message.parentId) return message
  const { parentId: _parentId, ...rest } = message
  return rest
}

/**
 * Odoo autocompleta `parent_id` encadenando al mensaje anterior del hilo,
 * elija o no elija el remitente responder a algo (ver
 * enrich-portal-chatter-messages.ts y portal-chatter-reply-links.supabase.ts
 * para el porqué). Antes de mostrar cualquier "respondiendo a X", se
 * sustituye ese dato por el registrado en Supabase, que solo se escribe
 * cuando el cliente pulsa "Responder" en el composer del portal.
 */
async function applyTrustedReplyLinks(
  messages: PortalChatterMessage[]
): Promise<PortalChatterMessage[]> {
  const replyLinks = await fetchChatterReplyLinks(messages.map((message) => message.id))
  if (!replyLinks.size) {
    return messages.map(stripUntrustedParentId)
  }

  return messages.map((message) => {
    const parentMessageId = replyLinks.get(message.id)
    return parentMessageId
      ? { ...message, parentId: parentMessageId }
      : stripUntrustedParentId(message)
  })
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
      messages: await applyTrustedReplyLinks(page.messages),
      hasMore: page.hasMore,
    }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}

export async function listNewerRecordMessagesAction(
  input: ListNewerRecordMessagesInput
): Promise<PortalChatterMessagesPageResult> {
  const access = await resolveClientPartnerId()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const recordId = parseRecordId(input.recordId)
  if (!recordId) {
    return { ok: false, error: 'not_found' }
  }

  const afterId = parseAfterId(input.afterId)
  if (afterId === null) {
    return { ok: false, error: 'not_found' }
  }

  try {
    const resModel = getOdooModelForRecordKind(input.kind)

    const [allowed, messages] = await Promise.all([
      verifyClientRecordAccess(input.kind, recordId, access.partnerId),
      listNewerPortalMessages({
        resModel,
        recordId,
        clientPartnerId: access.partnerId,
        afterId,
      }),
    ])

    if (!allowed) {
      return { ok: false, error: 'not_found' }
    }

    return { ok: true, messages: await applyTrustedReplyLinks(messages), hasMore: false }
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
  const notifyPartnerIds = sanitizeNotifyPartnerIds(input.notifyPartnerIds)

  try {
    const resModel = getOdooModelForRecordKind(input.kind)
    const parentValidPromise = parentId
      ? verifyParentMessageBelongsToRecord({
          parentId,
          resModel,
          recordId,
          clientPartnerId: access.partnerId,
        })
      : Promise.resolve(true)

    const [canReply, allowed, attachmentIds, parentValid] = await Promise.all([
      canClientReplyOnRecord(input.kind, recordId),
      verifyClientRecordAccess(input.kind, recordId, access.partnerId),
      files.length
        ? createAttachmentsForRecord({
            resModel,
            resId: recordId,
            files,
          })
        : Promise.resolve([] as number[]),
      parentValidPromise,
    ])

    if (!canReply) {
      return { ok: false, error: 'read_only' }
    }

    if (!allowed) {
      return { ok: false, error: 'not_found' }
    }

    if (!parentValid) {
      return { ok: false, error: 'invalid_parent' }
    }

    const attachmentRefs = attachmentIds.map((id, index) => ({
      id,
      name: files[index]?.name ?? 'Adjunto',
      ...(files[index]?.mimetype ? { mimetype: files[index].mimetype } : {}),
    }))

    const message = await postRecordComment({
      resModel,
      recordId,
      clientPartnerId: access.partnerId,
      htmlBody,
      parentId,
      attachmentIds,
      attachmentRefs,
      notifyPartnerIds,
    })

    updateTag(chatterUnreadBatchCacheTag(access.partnerId))

    const hadAttachments = files.length > 0
    const attachmentCountEstimate = hadAttachments ? files.length : undefined

    if (parentId) {
      after(() => {
        void recordChatterReplyLink({
          messageId: message.id,
          parentMessageId: parentId,
        }).catch(() => {
          // Best-effort: si falla, esta respuesta simplemente no mostrará
          // la cita al recargar la conversación; no bloquea el envío.
        })
      })
    }

    after(() => {
      if (!hadAttachments) return

      updateTag(tramitesSnapshotCacheTag(access.partnerId))

      void (async () => {
        const counts = await countAttachmentsByRecordIds(resModel, [recordId])
        const attachmentCount = counts.get(recordId) ?? files.length

        await advanceAttachmentWatchState({
          actorId: access.actorId,
          kind: input.kind,
          recordId,
          attachmentCount,
        })
      })()
    })

    return {
      ok: true,
      message: {
        ...message,
        authorName: portalChatter.youLabel,
      },
      ...(attachmentCountEstimate !== undefined
        ? { attachmentCount: attachmentCountEstimate }
        : {}),
    }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
