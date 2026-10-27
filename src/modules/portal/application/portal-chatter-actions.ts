'use server'

import { after } from 'next/server'
import { revalidateTag, updateTag } from 'next/cache'

import { portalChatter } from '@/content/portal-chatter'

import { checkRateLimit } from '@/lib/rate-limit/check-rate-limit'
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
  RecordDrawerBundleResult,
} from '@/src/modules/portal/domain/portal-chatter-types'
import { getSession } from '@/src/modules/auth/application/get-session'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import { getWorkerWriteSections } from '@/src/modules/colaboradores/application/get-worker-write-sections'
import type { WorkerAccessLevel, WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { validateChatterUploadFiles } from '@/src/modules/portal/lib/chatter-attachment-validation'
import { restrictNotifyPartnerIds } from '@/src/modules/portal/domain/notify-partner-ids'
import {
  chatterUnreadBatchCacheTag,
  forgetRecentTramitesLoad,
  getCachedTramitesSnapshot,
  tramitesSnapshotCacheTag,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import {
  canClientReplyOnRecord,
  getOdooModelForRecordKind,
  resolveTaskWorkerSection,
  verifyClientRecordAccess,
} from '@/src/modules/portal/infrastructure/portal-record-access'
import { createAttachmentsForRecord } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import {
  isOdooApiConfigured,
  resolveOdooErrorCode,
  runWithOdooPriority,
} from '@/src/modules/portal/infrastructure/odoo-json-client'
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
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import { CHATTER_MESSAGE_MAX_LENGTH } from '@/src/modules/portal/infrastructure/portal-chatter-env'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'
import { fetchTramiteDescription } from '@/src/modules/tramites/infrastructure/odoo-tramite-description-repository'

async function resolveClientPartnerId(
  requiredLevel: WorkerAccessLevel = 'read'
): Promise<
  | {
      ok: true
      partnerId: number
      actorId: string
      /** Secciones del colaborador para este nivel; `null` si es el titular. */
      workerSections: Set<WorkerSectionHref> | null
    }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'odoo_unavailable' }
> {
  const session = await getSession({ allowViewAsRead: requiredLevel === 'read' })
  if (!session || !isClientOrWorkerRole(session.user.role)) {
    return { ok: false, error: 'forbidden' }
  }

  /**
   * Chatter de trámites, consultas (`/tramites`) y obligaciones (`/obligaciones`, también un
   * `project.task`). Un colaborador necesita al menos una de las dos secciones; cuál vale para
   * cada registro se comprueba después (`verifyRecordAccess`), porque Odoo no distingue por modelo.
   */
  let workerSections: Set<WorkerSectionHref> | null = null
  if (session.user.role === 'worker') {
    workerSections =
      requiredLevel === 'write'
        ? await getWorkerWriteSections(session.user)
        : await getAllowedSectionsForWorker(session.user)
    if (!workerSections.has('/tramites') && !workerSections.has('/obligaciones')) {
      return { ok: false, error: 'forbidden' }
    }
  }

  const partnerId = await resolveClientOdooPartnerId(session.user)
  if (!partnerId) {
    return { ok: false, error: 'not_linked' }
  }

  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  const actorId = await resolveDirectoryActorId(session.user)
  return { ok: true, partnerId, actorId, workerSections }
}

/**
 * El registro es del cliente Y, si quien pregunta es un colaborador, de una sección que tiene
 * concedida: una consulta (ticket) es de `/tramites`; una tarea, de `/tramites` o `/obligaciones`
 * según en qué lista del cliente aparezca. Con las dos secciones no hace falta mirar cuál.
 */
async function verifyRecordAccess(
  access: { partnerId: number; workerSections: Set<WorkerSectionHref> | null },
  kind: PortalRecordKind,
  recordId: number
): Promise<boolean> {
  if (!(await verifyClientRecordAccess(kind, recordId, access.partnerId))) return false

  const sections = access.workerSections
  if (!sections) return true
  if (kind === 'ticket') return sections.has('/tramites')
  if (sections.has('/tramites') && sections.has('/obligaciones')) return true

  const section = await resolveTaskWorkerSection(recordId, access.partnerId)
  return section !== null && sections.has(section)
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

/** Cuánto se espera al snapshot de trámites para conocer a los responsables antes de publicar. */
const ASSIGNEES_LOOKUP_GRACE_MS = 1500

/**
 * Responsables reales del registro (los que reciben el aviso por correo de lo que escribe el
 * cliente), sacados del snapshot del servidor y nunca del navegador. Sin snapshot a tiempo, nadie:
 * es preferible no avisar por correo a avisar a quien no toca.
 */
async function loadAssigneePartnerIds(
  kind: ListRecordMessagesInput['kind'],
  recordId: number,
  clientPartnerId: number
): Promise<number[]> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const snapshot = await Promise.race([
      getCachedTramitesSnapshot(clientPartnerId),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ASSIGNEES_LOOKUP_GRACE_MS)
      }),
    ])
    if (!snapshot) return []
    const record =
      kind === 'task'
        ? snapshot.tasks.find((task) => task.id === recordId)
        : snapshot.tickets.find((ticket) => ticket.id === recordId)
    return record?.assignedNotifyPartnerIds ?? []
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

function stripUntrustedParentId(message: PortalChatterMessage): PortalChatterMessage {
  if (!message.parentId) return message
  const rest = { ...message }
  delete rest.parentId
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

export async function listRecordMessagesAction(
  input: ListRecordMessagesInput
): Promise<PortalChatterMessagesPageResult> {
  return runWithOdooPriority(() => listRecordMessagesActionImpl(input))
}

async function listRecordMessagesActionImpl(
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
      verifyRecordAccess(access, input.kind, recordId),
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

/**
 * Mensajes y descripción de un trámite o consulta en UNA sola Server Action: las acciones salen en
 * cola desde el navegador y cada una repetía sesión, permiso y consultas a Odoo. Odoo atiende las
 * peticiones en serie, así que lo que ahorra tiempo es pedir menos, no pedir a la vez.
 * Una descripción que falla no tumba los mensajes.
 */
export async function getRecordDrawerBundleAction(input: {
  kind: ListRecordMessagesInput['kind']
  recordId: number
}): Promise<RecordDrawerBundleResult> {
  return runWithOdooPriority(() => getRecordDrawerBundleActionImpl(input))
}

async function getRecordDrawerBundleActionImpl(input: {
  kind: ListRecordMessagesInput['kind']
  recordId: number
}): Promise<RecordDrawerBundleResult> {
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

    const [allowed, page, description] = await Promise.all([
      verifyRecordAccess(access, input.kind, recordId),
      listPortalMessagesPage({
        resModel,
        recordId,
        clientPartnerId: access.partnerId,
      }),
      input.kind === 'task'
        ? fetchTramiteDescription(recordId).catch(() => null)
        : Promise.resolve(null),
    ])

    if (!allowed) {
      return { ok: false, error: 'not_found' }
    }

    return {
      ok: true,
      messages: await applyTrustedReplyLinks(page.messages),
      hasMore: page.hasMore,
      description,
    }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}

export type TramiteDescriptionResult =
  | { ok: true; html: string | null }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'not_found' | 'odoo_unavailable' | 'odoo_rate_limited' }

/** Descripción (HTML ya saneado) de un trámite del cliente; `html: null` si no tiene. */
export async function getTramiteDescriptionAction(taskId: number): Promise<TramiteDescriptionResult> {
  return runWithOdooPriority(() => getTramiteDescriptionActionImpl(taskId))
}

async function getTramiteDescriptionActionImpl(taskId: number): Promise<TramiteDescriptionResult> {
  const access = await resolveClientPartnerId()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const recordId = parseRecordId(taskId)
  if (!recordId) {
    return { ok: false, error: 'not_found' }
  }

  try {
    const allowed = await verifyRecordAccess(access, 'task', recordId)
    if (!allowed) {
      return { ok: false, error: 'not_found' }
    }

    return { ok: true, html: await fetchTramiteDescription(recordId) }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}

export async function listNewerRecordMessagesAction(
  input: ListNewerRecordMessagesInput
): Promise<PortalChatterMessagesPageResult> {
  return runWithOdooPriority(() => listNewerRecordMessagesActionImpl(input))
}

async function listNewerRecordMessagesActionImpl(
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
      verifyRecordAccess(access, input.kind, recordId),
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

/** Mandar mensajes de chatter es más frecuente que crear tickets, pero sigue acotado. */
const POST_MESSAGE_RATE_LIMIT = { limit: 20, windowSeconds: 300 }

export async function postRecordMessageAction(
  input: PostRecordMessageInput
): Promise<PortalChatterPostResult> {
  const access = await resolveClientPartnerId('write')
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const allowed = await checkRateLimit(`chatter-post:${access.actorId}`, POST_MESSAGE_RATE_LIMIT)
  if (!allowed) {
    return { ok: false, error: 'rate_limited' }
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
  const requestedNotifyPartnerIds = sanitizeNotifyPartnerIds(input.notifyPartnerIds)

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
      verifyRecordAccess(access, input.kind, recordId),
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

    // El navegador solo elige entre los responsables reales del registro (calculados aquí).
    const notifyPartnerIds = requestedNotifyPartnerIds.length
      ? restrictNotifyPartnerIds(
          requestedNotifyPartnerIds,
          await loadAssigneePartnerIds(input.kind, recordId, access.partnerId)
        )
      : []

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

      // El contador de documentos de la lista sale de este snapshot.
      forgetRecentTramitesLoad(access.partnerId)
      revalidateTag(tramitesSnapshotCacheTag(access.partnerId), 'max')
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
